"""Conservative per-trash-track state machine; geometric association is only provisional."""

from collections import deque
from dataclasses import dataclass, field


@dataclass
class Observation:
    frame_index: int
    time_seconds: float
    box: tuple[float, float, float, float]
    confidence: float


@dataclass
class TrackEvent:
    object_track_id: int
    state: str = "unknown"
    actor_track_id: int | None = None
    association_candidate_id: int | None = None
    association_streak: int = 0
    history: list[Observation] = field(default_factory=list)
    transitions: list[dict] = field(default_factory=list)
    separation_frame: int | None = None
    stationary_since: int | None = None
    emitted: bool = False
    cancelled: bool = False


def center(box):
    return ((box[0] + box[2]) / 2, (box[1] + box[3]) / 2)


def expanded(box, scale=0.15):
    width, height = box[2] - box[0], box[3] - box[1]
    return box[0] - width * scale, box[1] - height * scale, box[2] + width * scale, box[3] + height * scale


def contains(box, point):
    x, y = point
    return box[0] <= x <= box[2] and box[1] <= y <= box[3]


class StartupCalibration:
    """Remember tracked litter visible during the startup window as pre-existing."""

    def __init__(self, frame_count: int):
        self.frame_count = frame_count
        self.preexisting_track_ids: set[int] = set()

    def eligible(self, frame_index: int, trash: list[dict]) -> list[dict]:
        if frame_index < self.frame_count:
            self.preexisting_track_ids.update(int(item["track_id"]) for item in trash
                                              if item.get("track_id") is not None)
        return [item for item in trash if item.get("track_id") not in self.preexisting_track_ids]


class EventTracker:
    def __init__(self, stationary_frames=18, carrying_frames=3, person_history_len=150):
        self.stationary_frames = stationary_frames
        self.carrying_frames = carrying_frames
        self.person_history = deque(maxlen=person_history_len)
        self.tracks: dict[int, TrackEvent] = {}

    def update(self, frame_index, time_seconds, trash, people):
        self.person_history.append((frame_index, time_seconds, list(people)))
        emitted, seen = [], set()
        for item in trash:
            object_id = item.get("track_id")
            if object_id is None:
                continue
            object_id = int(object_id)
            seen.add(object_id)
            track = self.tracks.setdefault(object_id, TrackEvent(object_track_id=object_id))
            box = tuple(float(v) for v in item["box"])
            track.history.append(Observation(frame_index, time_seconds, box, float(item["confidence"])))
            track.history = track.history[-180:]
            object_center = center(box)
            candidates = [int(p["track_id"]) for p in people if p.get("track_id") is not None
                          and contains(expanded(tuple(p["box"])), object_center)]
            if track.actor_track_id is None:
                candidate = candidates[0] if len(candidates) == 1 else None
                if candidate is None:
                    track.association_candidate_id, track.association_streak = None, 0
                    # Retrospective spatio-temporal check: did a person pass over this object origin?
                    for p_fidx, p_sec, p_list in reversed(self.person_history):
                        if p_fidx >= frame_index:
                            continue
                        matches = [int(p["track_id"]) for p in p_list if p.get("track_id") is not None
                                   and contains(expanded(tuple(p["box"])), object_center)]
                        if matches:
                            track.actor_track_id = matches[0]
                            track.state = "carrying"
                            track.separation_frame = p_fidx
                            track.stationary_since = frame_index
                            self._transition(track, "unknown", p_fidx, p_sec,
                                             "Provisional actor trajectory identified at drop location")
                            self._transition(track, "carrying", p_fidx, p_sec,
                                             "Provisional geometric association persisted; requires visual review")
                            break
                elif candidate == track.association_candidate_id:
                    track.association_streak += 1
                else:
                    track.association_candidate_id, track.association_streak = candidate, 1
                if track.association_streak >= self.carrying_frames:
                    track.actor_track_id = track.association_candidate_id
                    track.state = "carrying"
                    self._transition(track, "carrying", frame_index, time_seconds,
                                     "Provisional geometric association persisted; requires visual review")

            within_owner = any(int(p.get("track_id", -1)) == track.actor_track_id
                               and contains(expanded(tuple(p["box"])), object_center) for p in people)
            owner_present = any(int(p.get("track_id", -1)) == track.actor_track_id for p in people)
            if track.state in {"carrying", "separation", "stationary", "suspected_littering"}:
                if within_owner and track.separation_frame is not None:
                    track.state, track.cancelled = "cancelled", True
                    self._transition(track, "cancelled", frame_index, time_seconds,
                                     "Object re-associated with provisional owner; possible pickup")
                    continue
                if not within_owner and track.state == "carrying":
                    track.state, track.separation_frame = "separation", frame_index
                    track.stationary_since = frame_index
                    self._transition(track, "separation", frame_index, time_seconds,
                                     "Object track separated from provisional owner")
                if track.state in {"separation", "stationary"}:
                    if self._is_stationary(track):
                        if track.stationary_since is None:
                            track.stationary_since = frame_index
                        if track.state != "stationary":
                            track.state = "stationary"
                            self._transition(track, "stationary", frame_index, time_seconds,
                                             "Object motion fell below the configured image-space threshold")
                        if (frame_index - track.stationary_since >= self.stationary_frames
                                and not owner_present and not track.emitted):
                            self._transition(track, "owner_left", frame_index, time_seconds,
                                             "Provisional owner track is no longer visible in the frame")
                            track.state, track.emitted = "suspected_littering", True
                            self._transition(track, "suspected_littering", frame_index, time_seconds,
                                             "Stationarity threshold met; event remains pending human review")
                            emitted.append({"object_track_id": object_id,
                                            "actor_track_id": None if owner_present else track.actor_track_id,
                                            "event_time_seconds": time_seconds,
                                            "object_confidence": float(item["confidence"]),
                                            "association": "unattributed" if track.actor_track_id is None else "provisional",
                                            "timeline": list(track.transitions), "box": box})
                    else:
                        track.stationary_since = None
                        if track.state == "stationary":
                            track.state = "separation"
            if track.state == "unknown" and not track.transitions:
                self._transition(track, "unknown", frame_index, time_seconds,
                                 "No unique provisional actor association")
        # Missing tracks never create an event or transfer attribution to another person.
        return emitted

    def _is_stationary(self, track):
        if len(track.history) < self.stationary_frames:
            return False
        a = center(track.history[-self.stationary_frames].box)
        b = center(track.history[-1].box)
        box = track.history[-1].box
        diagonal = max(((box[2]-box[0])**2 + (box[3]-box[1])**2) ** 0.5, 1.0)
        return ((a[0]-b[0])**2 + (a[1]-b[1])**2) ** 0.5 <= diagonal * 0.75

    @staticmethod
    def _transition(track, state, frame, seconds, reason):
        track.transitions.append({"state": state, "frame": frame, "time_seconds": seconds, "reason": reason})
