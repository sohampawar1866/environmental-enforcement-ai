from app.vision.events import EventTracker, StartupCalibration


def test_unassociated_trash_does_not_create_incident():
    tracker = EventTracker(stationary_frames=3)
    for frame in range(12):
        events = tracker.update(frame, frame / 10, [{"track_id": 9, "box": (40, 40, 50, 50), "confidence": .8}], [])
        assert events == []


def test_startup_calibration_suppresses_preexisting_object_track():
    calibration = StartupCalibration(frame_count=3)
    old_trash = {"track_id": 9, "box": (10, 10, 20, 20), "confidence": .8}
    arriving_trash = {"track_id": 10, "box": (30, 30, 40, 40), "confidence": .8}
    assert calibration.eligible(0, [old_trash]) == []
    assert calibration.eligible(1, [old_trash]) == []
    assert calibration.eligible(3, [old_trash, arriving_trash]) == [arriving_trash]


def test_provisional_owner_separation_and_stationarity_creates_candidate():
    tracker = EventTracker(stationary_frames=3)
    # Establish an initial person/object association.
    for frame in range(3):
        tracker.update(frame, frame / 10, [{"track_id": 9, "box": (45, 45, 55, 55), "confidence": .8}],
                       [{"track_id": 4, "box": (0, 0, 100, 120)}])
    emitted = []
    for frame in range(3, 12):
        emitted.extend(tracker.update(frame, frame / 10,
                       [{"track_id": 9, "box": (150, 150, 160, 160), "confidence": .8}], []))
    assert len(emitted) == 1
    assert emitted[0]["object_track_id"] == 9
    assert emitted[0]["actor_track_id"] == 4
    assert [step["state"] for step in emitted[0]["timeline"]] == [
        "unknown", "carrying", "separation", "stationary", "owner_left", "suspected_littering"
    ]


def test_object_returning_to_provisional_owner_cancels():
    tracker = EventTracker(stationary_frames=3)
    for frame in range(3):
        tracker.update(frame, frame / 10, [{"track_id": 9, "box": (45, 45, 55, 55), "confidence": .8}],
                       [{"track_id": 4, "box": (0, 0, 100, 120)}])
    tracker.update(3, .3, [{"track_id": 9, "box": (150, 150, 160, 160), "confidence": .8}], [])
    events = tracker.update(4, .4, [{"track_id": 9, "box": (45, 45, 55, 55), "confidence": .8}],
                            [{"track_id": 4, "box": (0, 0, 100, 120)}])
    assert events == []
    assert tracker.tracks[9].state == "cancelled"


def test_owner_return_after_candidate_marks_track_cancelled():
    tracker = EventTracker(stationary_frames=3)
    for frame in range(3):
        tracker.update(frame, frame / 10, [{"track_id": 9, "box": (45, 45, 55, 55), "confidence": .8}],
                       [{"track_id": 4, "box": (0, 0, 100, 120)}])
    candidate = []
    for frame in range(3, 10):
        candidate.extend(tracker.update(frame, frame / 10,
                         [{"track_id": 9, "box": (150, 150, 160, 160), "confidence": .8}], []))
        if candidate:
            break
    assert candidate
    tracker.update(frame + 1, (frame + 1) / 10,
                   [{"track_id": 9, "box": (45, 45, 55, 55), "confidence": .8}],
                   [{"track_id": 4, "box": (0, 0, 100, 120)}])
    assert tracker.tracks[9].cancelled
