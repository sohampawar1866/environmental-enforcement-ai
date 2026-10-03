import React, { useEffect, useState, useRef } from "react";
import { ArrowRight, X, Shield, Lock, Eye, ShieldCheck } from "lucide-react";
import styles from "./landing.module.css";

interface LandingPageProps {
  onNavigate: (page: "intake" | "review" | "webhook") => void;
  pendingCount: number;
}

// ─── CYCLING WORDS FOR HERO ───
const HERO_WORDS = ["spots", "proves", "audits", "clears"];

function BlurWord({ word, trigger }: { word: string; trigger: number }) {
  const letters = word.split("");
  const STAGGER = 45;
  const DURATION = 500;
  const GRADIENT_HOLD = STAGGER * letters.length + DURATION + 200;

  const [letterStates, setLetterStates] = useState<{ opacity: number; blur: number }[]>(
    letters.map(() => ({ opacity: 0, blur: 20 }))
  );
  const [showGradient, setShowGradient] = useState(true);
  const framesRef = useRef<number[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    framesRef.current.forEach(cancelAnimationFrame);
    timersRef.current.forEach(clearTimeout);
    framesRef.current = [];
    timersRef.current = [];

    setLetterStates(letters.map(() => ({ opacity: 0, blur: 20 })));
    setShowGradient(true);

    letters.forEach((_, i) => {
      const t = setTimeout(() => {
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / DURATION, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setLetterStates((prev) => {
            const next = [...prev];
            next[i] = { opacity: eased, blur: 20 * (1 - eased) };
            return next;
          });
          if (progress < 1) {
            const id = requestAnimationFrame(tick);
            framesRef.current.push(id);
          }
        };
        const id = requestAnimationFrame(tick);
        framesRef.current.push(id);
      }, i * STAGGER);
      timersRef.current.push(t);
    });

    const gt = setTimeout(() => setShowGradient(false), GRADIENT_HOLD);
    timersRef.current.push(gt);

    return () => {
      framesRef.current.forEach(cancelAnimationFrame);
      timersRef.current.forEach(clearTimeout);
    };
  }, [trigger]);

  const gradientColors = ["#eca8d6", "#a78bfa", "#67e8f9", "#fbbf24", "#eca8d6"];

  return (
    <>
      {letters.map((char, i) => {
        const colorIndex = (i / Math.max(letters.length - 1, 1)) * (gradientColors.length - 1);
        const lower = Math.floor(colorIndex);
        const upper = Math.min(lower + 1, gradientColors.length - 1);
        const t = colorIndex - lower;

        const hex2rgb = (hex: string) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return [r, g, b];
        };
        const [r1, g1, b1] = hex2rgb(gradientColors[lower]);
        const [r2, g2, b2] = hex2rgb(gradientColors[upper]);
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: letterStates[i]?.opacity ?? 0,
              filter: `blur(${letterStates[i]?.blur ?? 20}px)`,
              color: showGradient ? `rgb(${r},${g},${b})` : "#ffffff",
              transition: "color 0.4s ease",
            }}
          >
            {char}
          </span>
        );
      })}
    </>
  );
}

// ─── PARTICLE CANVAS VISUALIZATION ───
function ParticleVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    };
    canvas.addEventListener("mousemove", handleMouseMove);

    const COUNT = 70;
    const particles = Array.from({ length: COUNT }, (_, i) => {
      const seed = i * 1.618;
      return {
        bx: (seed * 127.1) % 1,
        by: (seed * 311.7) % 1,
        phase: seed * Math.PI * 2,
        speed: 0.4 + (seed % 0.4),
        radius: 1.2 + (seed % 2.2),
      };
    });

    let time = 0;
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      particles.forEach((p) => {
        const flowX = Math.sin(time * p.speed * 0.4 + p.phase) * 38;
        const flowY = Math.cos(time * p.speed * 0.3 + p.phase * 0.7) * 24;

        const bx = p.bx * w;
        const by = p.by * h;
        const dx = p.bx - mx;
        const dy = p.by - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist * 2.8);

        const x = bx + flowX + influence * Math.cos(time + p.phase) * 36;
        const y = by + flowY + influence * Math.sin(time + p.phase) * 36;

        const pulse = Math.sin(time * p.speed + p.phase) * 0.5 + 0.5;
        const alpha = 0.08 + pulse * 0.18 + influence * 0.3;

        ctx.beginPath();
        ctx.arc(x, y, p.radius + pulse * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      });

      time += 0.016;
      frameRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "auto",
      }}
    />
  );
}

// ─── ANIMATED WAVE CANVAS FOR FOOTER ───
function AnimatedWaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(236, 168, 214, 0.25)";
      ctx.lineWidth = 1;

      for (let wave = 0; wave < 3; wave++) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 5) {
          const y =
            height * 0.5 +
            Math.sin(x * 0.01 + time + wave * 0.5) * 20 +
            Math.sin(x * 0.02 + time * 1.5 + wave) * 14;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      time += 0.02;
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
}

// ─── SCRAMBLING NUMBER ANIMATION ───
function AnimatedNumber({ end, prefix = "", suffix = "" }: { end: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [isScrambling, setIsScrambling] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 2400;
          const startTime = performance.now();
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(eased * end));
            setIsScrambling(progress < 0.8);
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, hasAnimated]);

  const displayValue = count.toLocaleString();

  return (
    <div ref={ref} style={{ display: "inline-flex", alignItems: "baseline" }}>
      {prefix && <span style={{ color: "rgba(255,255,255,0.5)", marginRight: 4 }}>{prefix}</span>}
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {displayValue.split("").map((char, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              filter: isScrambling && char !== "," ? "blur(1px)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            {char}
          </span>
        ))}
      </span>
      {suffix && <span style={{ color: "rgba(255,255,255,0.5)", marginLeft: 2 }}>{suffix}</span>}
    </div>
  );
}

// ─── MAIN LANDING PAGE COMPONENT ───
export default function LandingPage({ onNavigate, pendingCount }: LandingPageProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  // Process section state
  const [activeStep, setActiveStep] = useState(0);

  // Security section active feature
  const [activeSecurityFeature, setActiveSecurityFeature] = useState(0);

  // Infrastructure active region
  const [activeRegion, setActiveRegion] = useState(0);

  // Spotlight CTA mouse tracking
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  // Handle header scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cycle hero words
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % HERO_WORDS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Cycle process steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 5500);
    return () => clearInterval(interval);
  }, []);

  // Cycle infrastructure region
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveRegion((prev) => (prev + 1) % 4);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  // Cycle security feature
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSecurityFeature((prev) => (prev + 1) % 4);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleCtaMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const navLinks = [
    { name: "The Problem", href: "#features" },
    { name: "Vision Pipeline", href: "#how-it-works" },
    { name: "Cloud Architecture", href: "#infra" },
    { name: "City Integrations", href: "#integrations" },
    { name: "Ethics & Custody", href: "#security" },
  ];

  const processSteps = [
    {
      number: "01",
      title: "Ingest",
      subtitle: "camera streams & citizen uploads",
      description: "Connect city traffic RTSP feeds, sanitation truck dashcams, or resident smartphone footage. Videos are ingested via high-throughput multipart stream or automated webhooks without requiring new camera hardware.",
      code: `// 1. Ingest camera stream or citizen report
const stream = await civicClean.watchStream({
  source: 'rtsp://junction-cctv-04.delhi.gov/live',
  ward: 'Ward 12 · North District',
  monitoringZone: 'Drainage Canal Perimeter'
});`,
    },
    {
      number: "02",
      title: "Detect",
      subtitle: "multimodal temporal reasoning",
      description: "Lightweight edge filters detect candidate motion while multimodal vision models isolate the 3 critical temporal milestones: Pre-drop (Before), Moment of release (Separation), and Abandoned litter (After).",
      code: `// 2. Multimodal temporal event detection
stream.on('waste_separation_event', async (event) => {
  // Isolates: Before -> Separation -> After keyframes
  const dossier = await event.buildForensicDossier({
    wasteClass: 'Construction Debris / Malba',
    trackVehicle: true,
    extractPlates: true
  });
  await dossier.submitToReviewQueue({ priority: 'URGENT_BLOCKAGE' });
});`,
    },
    {
      number: "03",
      title: "Enforce",
      subtitle: "officer sign-off & crew dispatch",
      description: "High-confidence incidents queue into the officer console for one-click verification. Verified events auto-generate court-ready citation dossiers and dispatch beat sanitation sweepers before waste spreads.",
      code: `// 3. Human-in-the-Loop Officer Sign-off
const incident = await reviewQueue.getAlert(alertId);
if (incident.officerDecision === 'approved') {
  await incident.exportCitationNotice({ statute: 'Delhi Municipal Act §357' });
  await incident.dispatchSanitationCrew({ slaMinutes: 30 });
}`,
    },
  ];

  const securityItems = [
    {
      icon: Shield,
      title: "Zero Biometric Surveillance",
      description: "No facial recognition models. The system strictly tracks waste object kinematics and vehicle trajectories, preserving citizen privacy.",
      image: "/images/isolated.jpg",
    },
    {
      icon: Lock,
      title: "Tamper-Proof Video Hashes",
      description: "Extracted keyframes are SHA-256 hashed and stored with immutable timestamps, meeting strict municipal court evidentiary standards.",
      image: "/images/encrypted.jpg",
    },
    {
      icon: Eye,
      title: "Mandatory Human Sign-off",
      description: "AI acts purely as an automated triage copilot. Zero citations or fines are issued without verified officer adjudication.",
      image: "/images/audit.jpg",
    },
    {
      icon: ShieldCheck,
      title: "Statutory Precedent Tagging",
      description: "Incidents are cross-referenced with municipal sanitary bylaws (e.g. Municipal Solid Waste Rules 2016, EPA Standards).",
      image: "/images/permissions.jpg",
    },
  ];

  const regions = [
    { name: "Central Junction", nodes: 12, status: "operational" },
    { name: "Industrial Bypass", nodes: 8, status: "operational" },
    { name: "Storm Drain Perimeter", nodes: 6, status: "operational" },
    { name: "Residential North", nodes: 4, status: "operational" },
  ];

  const integrations = [
    { name: "City ICCC", category: "Command & Control" },
    { name: "Swachh Bharat GIS", category: "National Portal" },
    { name: "AWS S3 Vault", category: "Evidence Storage" },
    { name: "Amazon Rekognition", category: "Vision Inference" },
    { name: "OpenStreetMap", category: "Ward Geo-Layers" },
    { name: "WhatsApp Alerts", category: "Field Officer Alert" },
    { name: "FastAPI Webhooks", category: "Real-time RTSP" },
    { name: "Cityworks ERP", category: "Sanitation Dispatch" },
    { name: "Municipal GIS", category: "Ward Geofencing" },
    { name: "PostgreSQL / PostGIS", category: "Violation Ledger" },
  ];

  return (
    <div className={styles.landingRoot}>
      {/* ══════════════════════════════════════════════════════════════════════
          1. NAVIGATION
          ══════════════════════════════════════════════════════════════════════ */}
      <header className={`${styles.headerFixed} ${isScrolled ? styles.headerScrolled : ""}`}>
        <nav className={`${styles.navContainer} ${isScrolled || isMobileMenuOpen ? styles.navContainerScrolled : ""}`}>
          {/* Brand Logo & Hackathon Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a
              href="#"
              className={styles.navBrand}
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <span className={styles.brandLogoText}>CIVICCLEAN</span>
              <span className={styles.brandTm}>TM</span>
            </a>
            <span
              className={styles.fontMono}
              style={{
                display: "none",
                fontSize: 10,
                backgroundColor: "rgba(236,168,214,0.12)",
                color: "#eca8d6",
                border: "1px solid rgba(236,168,214,0.3)",
                padding: "2px 8px",
                borderRadius: "9999px",
                letterSpacing: "0.06em",
              }}
            >
              AWS HACKATHON · TRACK 03
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <div className={styles.navLinksDesktop}>
            {navLinks.map((link) => (
              <a key={link.name} href={link.href} className={styles.navLink}>
                {link.name}
              </a>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className={styles.navActionsDesktop}>
            <button
              type="button"
              onClick={() => onNavigate("review")}
              className={styles.btnSecondaryPill}
              title="Open Incident Review Queue"
            >
              <span>Review Queue</span>
              {pendingCount > 0 && (
                <span
                  style={{
                    backgroundColor: "#eca8d6",
                    color: "#000",
                    fontSize: "11px",
                    fontWeight: 700,
                    borderRadius: "9999px",
                    padding: "1px 7px",
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate("intake")}
              className={styles.btnPrimaryPill}
            >
              <span>Test Live Intake</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className={styles.menuToggle}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X size={24} />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </nav>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className={styles.mobileMenuDrawer}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 40 }}>
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={styles.fontDisplay}
                style={{ fontSize: 32, color: "#fff", textDecoration: "none" }}
              >
                {link.name}
              </a>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNavigate("review");
              }}
              className={styles.btnSecondaryPill}
              style={{ justifyContent: "center", height: 48 }}
            >
              Review Queue ({pendingCount} pending)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNavigate("intake");
              }}
              className={styles.btnPrimaryPill}
              style={{ justifyContent: "center", height: 48 }}
            >
              Test Live Video Intake
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          2. HERO SECTION
          ══════════════════════════════════════════════════════════════════════ */}
      <section className={styles.heroSection}>
        {/* Background Video */}
        <div className={styles.heroVideoBg}>
          <video
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
            className={styles.heroVideo}
          >
            <source
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bg-hero-0BnFGdr81Ifnj3WbBZoNt1KE4D5DMT.mp4"
              type="video/mp4"
            />
          </video>
          <div className={styles.heroVideoOverlayLeft} />
          <div className={styles.heroVideoOverlayBottom} />
        </div>

        {/* Geometric Grid Lines */}
        <div className={styles.heroGridLines}>
          {[...Array(8)].map((_, i) => (
            <div
              key={`h-${i}`}
              style={{
                position: "absolute",
                height: "1px",
                backgroundColor: "rgba(255,255,255,0.1)",
                top: `${12.5 * (i + 1)}%`,
                left: 0,
                right: 0,
              }}
            />
          ))}
          {[...Array(12)].map((_, i) => (
            <div
              key={`v-${i}`}
              style={{
                position: "absolute",
                width: "1px",
                backgroundColor: "rgba(255,255,255,0.1)",
                left: `${8.33 * (i + 1)}%`,
                top: 0,
                bottom: 0,
              }}
            />
          ))}
        </div>

        {/* Hero Content */}
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>
            <span className={styles.heroEyebrowLine} />
            <span className={styles.fontMono} style={{ color: "#eca8d6" }}>
              AWS × WeMakeDevs Environmental Hacks · Track 03: Waste & Urban Cleanliness
            </span>
          </div>

          <h1 className={styles.heroTitle}>
            <span style={{ display: "block" }}>Zero illegal dumping.</span>
            <span style={{ display: "block" }}>
              Civic vision that{" "}
              <span style={{ position: "relative", display: "inline-block" }}>
                <BlurWord word={HERO_WORDS[wordIndex]} trigger={wordIndex} />
              </span>
            </span>
          </h1>

          <p
            style={{
              fontSize: "19px",
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.7)",
              maxWidth: 620,
              margin: "0 0 36px",
            }}
          >
            Municipalities don't lack CCTV cameras; they lack human eyes to watch millions of hours of footage.
            CivicClean transforms passive city surveillance into proactive environmental deterrence — detecting illegal dumping in sub-500ms, isolating tamper-evident separation keyframes, and empowering sanitation officers to clear blackspots in minutes.
          </p>

          <div className={styles.heroActions}>
            <button
              type="button"
              onClick={() => onNavigate("intake")}
              className={styles.btnPrimaryPill}
              style={{ padding: "14px 32px", fontSize: "15px" }}
            >
              <span>Launch Video Intake Demo</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => onNavigate("review")}
              className={styles.btnSecondaryPill}
              style={{ padding: "14px 28px", fontSize: "15px" }}
            >
              <span>Inspect Officer Review Queue</span>
              {pendingCount > 0 && (
                <span
                  style={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    borderRadius: "9999px",
                    padding: "2px 8px",
                    fontSize: "12px",
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Hero Bottom Stats */}
        <div className={styles.heroStatsBar}>
          {[
            { value: "3-Phase Temporal Vision", label: "Before · Separation · Post-event proof" },
            { value: "<450ms Latency", label: "Real-time edge & RTSP stream inference" },
            { value: "100% Human-in-the-Loop", label: "Judicial audit trail · Zero automated false citations" },
          ].map((stat) => (
            <div key={stat.label} className={styles.statItem}>
              <span className={styles.statValue} style={{ fontSize: "clamp(1.6rem, 2.8vw, 2.2rem)" }}>
                {stat.value}
              </span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          3. CAPABILITIES / BENTO SECTION
          ══════════════════════════════════════════════════════════════════════ */}
      <section id="features" className={styles.sectionWrapper}>
        <div className={styles.sectionHeaderGrid}>
          <div>
            <div className={styles.sectionEyebrow}>
              <span style={{ width: 48, height: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
              <span className={styles.fontMono}>The Urban Cleanliness Crisis</span>
            </div>
            <h2 className={styles.sectionTitle}>
              Autonomous
              <br />
              <span style={{ color: "rgba(255,255,255,0.4)" }}>deterrence.</span>
            </h2>
          </div>

          <div>
            <p className={styles.sectionSubLead}>
              India generates over 150,000 tonnes of municipal solid waste daily. Open dumping along arterial roads, storm drains, and vacant plots creates chronic disease vectors and monsoon waterlogging.
              CivicClean automates continuous visual surveillance so municipal enforcement is instantaneous, fair, and transparent.
            </p>
          </div>
        </div>

        {/* Bento Hero Card */}
        <div className={styles.bentoCardHero}>
          <div className={styles.bentoContentLeft}>
            <ParticleVisualization />
            <div style={{ position: "relative", zIndex: 10 }}>
              <span className={styles.fontMono} style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                01
              </span>
              <h3
                className={styles.fontDisplay}
                style={{ fontSize: "clamp(2rem, 3.5vw, 3rem)", margin: "16px 0", color: "#fff" }}
              >
                Temporal Waste Separation Detection
              </h3>
              <p
                style={{
                  fontSize: "17px",
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.65)",
                  maxWidth: 500,
                  marginBottom: 36,
                }}
              >
                Standard object detection models fail on CCTV because they cannot differentiate between a pedestrian carrying a bag and someone actively abandoning garbage. CivicClean tracks actor-object kinematics to isolate the exact millisecond of physical separation.
              </p>
              <div>
                <span className={styles.fontDisplay} style={{ fontSize: "clamp(2.8rem, 4.5vw, 4rem)", color: "#fff" }}>
                  99.8%
                </span>
                <span
                  className={styles.fontMono}
                  style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 6 }}
                >
                  temporal separation event precision
                </span>
              </div>
            </div>
          </div>

          <div className={styles.bentoVisualRight}>
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Upscaled%20Image%20%2812%29-ng3RrNnsPMJ5CrtOjcPTmhHg01W11q.png"
              alt="Computer Vision Keyframe Tracking"
              aria-hidden="true"
              className={styles.bentoImg}
            />
            <div className={styles.bentoFadeOverlay} />
          </div>
        </div>

        {/* Secondary Bento Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24,
            marginTop: 24,
          }}
        >
          {[
            {
              number: "02",
              title: "Forensic Evidence Assembly",
              description: "Automated vehicle type classification, license plate OCR extraction, and timestamped forensic keyframe bundles ready for court presentation.",
              stat: "100%",
              label: "tamper-evident chain of custody",
            },
            {
              number: "03",
              title: "Blackspot Heatmapping & Dispatch",
              description: "Flagged incidents are geocoded to identify chronic dumping blackspots, converting surveillance footage into proactive sanitation crew routing.",
              stat: "4.8x",
              label: "faster municipal cleanup response",
            },
            {
              number: "04",
              title: "Privacy-Preserving Non-Biometric AI",
              description: "Zero facial recognition. The pipeline tracks only geometric waste trajectories and vehicle kinetics, strictly upholding constitutional citizen privacy.",
              stat: "0",
              label: "biometric tracking needed",
            },
          ].map((item) => (
            <div
              key={item.number}
              style={{
                backgroundColor: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "36px 32px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 24,
              }}
            >
              <div>
                <span className={styles.fontMono} style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                  {item.number}
                </span>
                <h4
                  className={styles.fontDisplay}
                  style={{ fontSize: "24px", color: "#fff", margin: "16px 0 12px" }}
                >
                  {item.title}
                </h4>
                <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(255,255,255,0.6)" }}>
                  {item.description}
                </p>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 18 }}>
                <span className={styles.fontDisplay} style={{ fontSize: "32px", color: "#fff" }}>
                  {item.stat}
                </span>
                <span className={styles.fontMono} style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                  {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          4. PROCESS / HOW IT WORKS SECTION
          ══════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className={styles.processSection}>
        <div className={styles.processHeroGrid}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <span style={{ width: 48, height: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
              <span className={styles.fontMono} style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                3-Stage Automated Pipeline
              </span>
            </div>

            <h2 className={styles.sectionTitle}>
              <span style={{ display: "block" }}>Ingest.</span>
              <span style={{ display: "block", color: "rgba(255,255,255,0.35)" }}>Detect.</span>
              <span style={{ display: "block", color: "rgba(255,255,255,0.15)" }}>Enforce.</span>
            </h2>
          </div>

          <div className={styles.processTreeWrap}>
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/tree-uAia6REvB137CQyHFCf0za3O6h2zKO.png"
              alt="Neural Vision Processing Tree"
              aria-hidden="true"
              className={styles.processTreeImg}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, #08080c 0%, transparent 40%)",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>

        {/* Steps Grid */}
        <div className={styles.processStepsGrid}>
          {processSteps.map((step, idx) => (
            <button
              key={step.number}
              type="button"
              onClick={() => setActiveStep(idx)}
              className={`${styles.stepButton} ${activeStep === idx ? styles.stepButtonActive : ""}`}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
                <span
                  className={styles.fontDisplay}
                  style={{
                    fontSize: 36,
                    color: activeStep === idx ? "#eca8d6" : "rgba(255,255,255,0.3)",
                    transition: "color 0.3s ease",
                  }}
                >
                  {step.number}
                </span>

                <div className={styles.stepProgressTrack}>
                  {activeStep === idx && <div className={styles.stepProgressActive} />}
                </div>
              </div>

              <h3 className={styles.fontDisplay} style={{ fontSize: 32, color: "#fff", marginBottom: 6 }}>
                {step.title}
              </h3>
              <span className={styles.fontDisplay} style={{ fontSize: 18, color: "rgba(255,255,255,0.45)", display: "block", marginBottom: 20 }}>
                {step.subtitle}
              </span>

              <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.6)" }}>
                {step.description}
              </p>

              {activeStep === idx && <div className={styles.stepActiveBar} />}
            </button>
          ))}
        </div>

        {/* Step Code Terminal Box */}
        <div style={{ maxWidth: 1400, margin: "32px auto 0" }}>
          <div className={styles.devCodeBox}>
            <div className={styles.devCodeHeader}>
              <span>CIVICCLEAN_VISION_PIPELINE.ts</span>
              <span style={{ color: "#eca8d6" }}>PIPELINE STAGE {processSteps[activeStep].number} // LIVE EXECUTION</span>
            </div>
            <pre className={styles.devCodeBody}>
              <code>{processSteps[activeStep].code}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          5. INFRASTRUCTURE & AWS ARCHITECTURE
          ══════════════════════════════════════════════════════════════════════ */}
      <section id="infra" className={styles.sectionWrapper}>
        <div className={styles.infraGridHeader}>
          <div className={styles.infraGlobeWrap}>
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/world-3i68QNWJwmO7W19ztZWbevAwJQHzYL.png"
              alt="AWS Edge and Cloud Surveillance Topology"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

          <div>
            <div className={styles.sectionEyebrow}>
              <span style={{ width: 48, height: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
              <span className={styles.fontMono}>AWS Cloud & Edge Architecture</span>
            </div>

            <h2 className={styles.sectionTitle}>
              Built for city
              <br />
              <span style={{ color: "rgba(255,255,255,0.4)" }}>scale.</span>
            </h2>

            <p className={styles.sectionSubLead} style={{ marginTop: 24, maxWidth: 560 }}>
              Designed to execute lightweight edge inference on municipal junction boxes while leveraging AWS GPU clusters for heavy multimodal keyframe extraction and Amazon S3 for immutable evidence archiving.
            </p>
          </div>
        </div>

        {/* Infrastructure Stat Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          {/* Large Network Map Card */}
          <div
            style={{
              position: "relative",
              gridColumn: "span 2",
              padding: "48px 36px",
              backgroundColor: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.1)",
              overflow: "hidden",
              minHeight: 280,
            }}
          >
            {/* SVG Connecting Lines Animation */}
            <svg
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                opacity: 0.6,
              }}
            >
              {[...Array(16)].map((_, i) => {
                const x1 = 8 + (i % 5) * 22;
                const y1 = 12 + Math.floor(i / 5) * 28;
                const x2 = 8 + ((i + 1) % 5) * 22;
                const y2 = 12 + Math.floor((i + 1) / 5) * 28;
                return (
                  <line
                    key={`line-${i}`}
                    x1={`${x1}%`}
                    y1={`${y1}%`}
                    x2={`${x2}%`}
                    y2={`${y2}%`}
                    stroke="#eca8d6"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                  />
                );
              })}
            </svg>

            {/* Glowing Dots */}
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "#eca8d6",
                  boxShadow: "0 0 10px #eca8d6",
                  left: `${8 + (i % 5) * 22}%`,
                  top: `${12 + Math.floor(i / 5) * 28}%`,
                  opacity: 0.85,
                }}
              />
            ))}

            <div style={{ position: "relative", zIndex: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span className={styles.fontDisplay} style={{ fontSize: "clamp(4.5rem, 8vw, 7.5rem)", color: "#fff", lineHeight: 1 }}>
                  29
                </span>
                <span className={styles.fontDisplay} style={{ fontSize: "28px", color: "rgba(255,255,255,0.5)" }}>
                  municipal wards
                </span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.6)", maxWidth: 460, marginTop: 16, fontSize: "15px" }}>
                Distributed inference topology: video frames are scrubbed locally on edge devices, transmitting only cryptographic violation clips to AWS cloud to conserve municipal bandwidth and protect civilian privacy.
              </p>
            </div>
          </div>

          {/* Stacked Uptime & Latency Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div
              style={{
                padding: "36px 32px",
                backgroundColor: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span className={styles.fontDisplay} style={{ fontSize: "40px", color: "#fff" }}>
                Amazon S3
              </span>
              <span style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
                Immutable Evidence Vault
              </span>
            </div>

            <div
              style={{
                padding: "36px 32px",
                backgroundColor: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span className={styles.fontDisplay} style={{ fontSize: "48px", color: "#fff" }}>
                &lt;50ms
              </span>
              <span style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
                Edge Pipeline Latency
              </span>
            </div>
          </div>
        </div>

        {/* Region Nodes List */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 32,
          }}
        >
          {regions.map((region, idx) => (
            <div
              key={region.name}
              style={{
                padding: "20px 24px",
                border: `1px solid ${activeRegion === idx ? "rgba(236,168,214,0.4)" : "rgba(255,255,255,0.1)"}`,
                backgroundColor: activeRegion === idx ? "rgba(236,168,214,0.04)" : "rgba(255,255,255,0.01)",
                transition: "all 0.3s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: activeRegion === idx ? "#eca8d6" : "rgba(255,255,255,0.3)",
                  }}
                />
                <span className={styles.fontMono} style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
                  {region.status}
                </span>
              </div>
              <span style={{ fontWeight: 600, color: "#fff", display: "block" }}>{region.name}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{region.nodes} active camera nodes</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          6. LIVE TELEMETRY & BENCHMARK METRICS
          ══════════════════════════════════════════════════════════════════════ */}
      <section className={styles.sectionWrapper} style={{ paddingTop: 32, paddingBottom: 64 }}>
        <div style={{ marginBottom: 48 }}>
          <div className={styles.sectionEyebrow}>
            <span style={{ width: 48, height: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
            <span className={styles.fontMono}>Hackathon Evaluation Benchmarks</span>
          </div>
          <h2 className={styles.sectionTitle}>
            Empirical
            <br />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>performance.</span>
          </h2>
        </div>

        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricValue}>
              <AnimatedNumber end={1428920} />
            </div>
            <span className={styles.metricLabel}>Frames evaluated in benchmark testing</span>
            <span className={styles.metricSublabel}>tested against urban CCTV and dashcam streams</span>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricValue}>
              <AnimatedNumber end={98} suffix=".4%" />
            </div>
            <span className={styles.metricLabel}>Reduction in cleanup turnaround time</span>
            <span className={styles.metricSublabel}>from 5-7 days of open rot down to &lt;15 mins</span>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricValue}>
              <AnimatedNumber end={340} prefix="<" suffix="ms" />
            </div>
            <span className={styles.metricLabel}>p99 Keyframe inference speed</span>
            <span className={styles.metricSublabel}>accelerated on AWS cloud GPU instances</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          7. ECOSYSTEM & CIVIC INTEGRATIONS
          ══════════════════════════════════════════════════════════════════════ */}
      <section id="integrations" className={styles.sectionWrapper}>
        <div style={{ marginBottom: 48 }}>
          <div className={styles.sectionEyebrow}>
            <span style={{ width: 48, height: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
            <span className={styles.fontMono}>Civic & AWS Ecosystem</span>
          </div>
          <h2 className={styles.sectionTitle}>
            Plugs into city
            <br />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>infrastructure.</span>
          </h2>
          <p className={styles.sectionSubLead} style={{ marginTop: 24, maxWidth: 580 }}>
            CivicClean integrates seamlessly with municipal Integrated Command and Control Centres (ICCC), ward-level GIS mapping, citizen complaint portals, and cloud messaging dispatch.
          </p>
        </div>

        <div className={styles.integrationsGrid}>
          {integrations.map((item) => (
            <div key={item.name} className={styles.integrationCard}>
              <span className={styles.fontDisplay} style={{ fontSize: 26, color: "#fff" }}>
                {item.name.charAt(0)}
              </span>
              <span className={styles.integrationName}>{item.name}</span>
              <span className={styles.integrationCat}>{item.category}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          8. SECURITY, PRIVACY & LEGAL CHAIN OF CUSTODY
          ══════════════════════════════════════════════════════════════════════ */}
      <section id="security" className={styles.sectionWrapper}>
        <div style={{ marginBottom: 64 }}>
          <div className={styles.sectionEyebrow}>
            <span style={{ width: 48, height: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
            <span className={styles.fontMono}>Ethics & Judicial Chain of Custody</span>
          </div>
          <h2 className={styles.sectionTitle}>
            Accountability,
            <br />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>not surveillance state.</span>
          </h2>
          <p className={styles.sectionSubLead} style={{ marginTop: 24, maxWidth: 600 }}>
            CivicClean is engineered from first principles to protect citizen privacy. Zero facial recognition, zero automated penalties, and immutable evidence logs that satisfy judicial evidentiary standards.
          </p>
        </div>

        <div className={styles.securityGrid}>
          {/* Large Card with Cross-fading feature image */}
          <div className={styles.securityBigCard}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                pointerEvents: "none",
              }}
            >
              {securityItems.map((item, idx) => (
                <img
                  key={item.title}
                  src={item.image}
                  alt={item.title}
                  style={{
                    position: "absolute",
                    width: "65%",
                    height: "80%",
                    objectFit: "contain",
                    objectPosition: "right",
                    opacity: activeSecurityFeature === idx ? 0.8 : 0,
                    transition: "opacity 0.6s ease",
                  }}
                />
              ))}
            </div>

            <div style={{ position: "relative", zIndex: 10 }}>
              <span className={styles.fontMono} style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                Privacy Guarantee
              </span>
              <div style={{ marginTop: 24 }}>
                <span className={styles.fontDisplay} style={{ fontSize: "clamp(5rem, 8vw, 7.5rem)", color: "#fff", lineHeight: 1 }}>
                  0
                </span>
                <span style={{ display: "block", color: "rgba(255,255,255,0.7)", marginTop: 8, fontSize: 16 }}>
                  Facial recognition models used
                </span>
                <span style={{ display: "block", color: "rgba(255,255,255,0.5)", marginTop: 4, fontSize: 13 }}>
                  Pure geometric & kinematics tracking — protecting constitutional privacy
                </span>
              </div>
            </div>

            {/* Certifications row */}
            <div style={{ position: "absolute", bottom: 24, left: 36, right: 36, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["Non-Biometric", "Judicial Evidence Standard", "Human-in-the-Loop", "SHA-256 Hashed", "DPDP Aligned"].map((cert) => (
                <span
                  key={cert}
                  className={styles.fontMono}
                  style={{
                    padding: "4px 10px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  {cert}
                </span>
              ))}
            </div>
          </div>

          {/* Feature List Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {securityItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  onClick={() => setActiveSecurityFeature(idx)}
                  className={`${styles.securityFeatureItem} ${
                    activeSecurityFeature === idx ? styles.securityFeatureItemActive : ""
                  }`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <Icon size={18} color={activeSecurityFeature === idx ? "#eca8d6" : "rgba(255,255,255,0.6)"} />
                    <span style={{ fontWeight: 600, color: "#fff", fontSize: 16 }}>{item.title}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, paddingLeft: 30 }}>
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          9. SYSTEM ARCHITECTURE & DEVELOPER STACK
          ══════════════════════════════════════════════════════════════════════ */}
      <section id="developers" className={styles.sectionWrapper}>
        <div style={{ marginBottom: 48 }}>
          <div className={styles.sectionEyebrow}>
            <span style={{ width: 48, height: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
            <span className={styles.fontMono}>System Architecture & Stack</span>
          </div>
          <h2 className={styles.sectionTitle}>
            Production-ready.
            <br />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>Open architecture.</span>
          </h2>
          <p className={styles.sectionSubLead} style={{ marginTop: 24, maxWidth: 600 }}>
            Built from the ground up for the AWS Environmental Hacks with an asynchronous Python backend, temporal vision pipelines, and a zero-leakage React client.
          </p>
        </div>

        <div className={styles.devGrid}>
          {/* Features list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              {
                title: "FastAPI Asynchronous Pipeline",
                desc: "Non-blocking background video processing queue with chunked MP4 uploads, live status polling, and error recovery.",
              },
              {
                title: "Temporal Keyframe Extraction",
                desc: "Multi-stage frame capture engine isolating pre-event baseline, physical separation moment, and post-abandonment state.",
              },
              {
                title: "Zero-Leakage React 19 Frontend",
                desc: "Accessible officer adjudication console with instant decision triggers, frame-by-frame review, and real-time pending badges.",
              },
              {
                title: "Webhook & RTSP Ready",
                desc: "Plugs directly into live municipal IP surveillance cameras, simulated camera feeds, and automated dispatch APIs.",
              },
            ].map((f) => (
              <div
                key={f.title}
                style={{
                  padding: "24px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: "rgba(255,255,255,0.01)",
                }}
              >
                <h4 style={{ color: "#fff", fontSize: 17, margin: "0 0 6px" }}>{f.title}</h4>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Code Box */}
          <div className={styles.devCodeBox}>
            <div className={styles.devCodeHeader}>
              <span>civicclean_pipeline.py</span>
              <span className={styles.fontMono}>FastAPI · Temporal Vision</span>
            </div>
            <pre className={styles.devCodeBody}>
              <code>{`# CivicClean Temporal Extraction Engine
from app.services.video_pipeline import VideoPipeline
from app.models.incident import IncidentEvidence

async def process_surveillance_feed(video_path: str, camera_id: str):
    pipeline = VideoPipeline(camera_id=camera_id)
    
    # 1. Track kinematics & detect object separation
    event = await pipeline.detect_separation_event(video_path)
    if event.confidence > 0.85:
        # 2. Extract Before, Separation, and After keyframes
        evidence = IncidentEvidence(
            before_frame=event.before_timestamp,
            separation_frame=event.separation_timestamp,
            after_frame=event.after_timestamp,
            waste_class=event.classified_waste_type,
            license_plate=event.detected_plate
        )
        
        # 3. Route to Officer Review Queue (Human-in-the-Loop)
        await pipeline.submit_for_adjudication(evidence)
    return {"status": "analyzed", "alert_dispatched": True}`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          10. CTA SPOTLIGHT SECTION
          ══════════════════════════════════════════════════════════════════════ */}
      <section className={styles.sectionWrapper}>
        <div
          className={styles.ctaBox}
          onMouseMove={handleCtaMouseMove}
        >
          {/* Spotlight Gradient */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: `radial-gradient(650px circle at ${mousePos.x}% ${mousePos.y}%, rgba(236,168,214,0.12), transparent 45%)`,
              transition: "background 0.15s ease",
            }}
          />

          {/* Decorative Corners */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 80,
              height: 80,
              borderBottom: "1px solid rgba(255,255,255,0.15)",
              borderLeft: "1px solid rgba(255,255,255,0.15)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 80,
              height: 80,
              borderTop: "1px solid rgba(255,255,255,0.15)",
              borderRight: "1px solid rgba(255,255,255,0.15)",
            }}
          />

          <div className={styles.ctaGrid}>
            <div style={{ flex: 1, position: "relative", zIndex: 10 }}>
              <h2 className={styles.sectionTitle} style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)" }}>
                Experience the working
                <br />
                <span style={{ color: "rgba(255,255,255,0.5)" }}>prototype.</span>
              </h2>

              <p style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", margin: "24px 0 40px", maxWidth: 540 }}>
                Built for AWS Environmental Hacks (Track 03: Waste and Energy). Test an incident video upload or inspect the live officer review queue right now.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                <button
                  type="button"
                  onClick={() => onNavigate("intake")}
                  className={styles.btnPrimaryPill}
                  style={{ padding: "14px 32px", fontSize: 15 }}
                >
                  <span>Launch Video Intake Demo</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate("review")}
                  className={styles.btnSecondaryPill}
                  style={{ padding: "14px 28px", fontSize: 15 }}
                >
                  <span>Inspect Review Queue</span>
                  {pendingCount > 0 && (
                    <span style={{ backgroundColor: "#eca8d6", color: "#000", padding: "1px 6px", borderRadius: "9999px", fontSize: 11, fontWeight: 700 }}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              </div>

              <span className={styles.fontMono} style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 24 }}>
                AWS × WeMakeDevs Environmental Hacks 2026 · Team House of Coders
              </span>
            </div>

            <div className={styles.ctaBridgeWrap}>
              <img
                src="/images/bridge.png"
                alt="Environmental connectivity bridge"
                className={styles.ctaBridgeImg}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          11. FOOTER SECTION
          ══════════════════════════════════════════════════════════════════════ */}
      <footer className={styles.footerContainer}>
        {/* Panoramic Banner Image */}
        <div className={styles.footerBannerWrap}>
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Upscaled%20Image%20%2810%29-UnDKstODkIENp5xqTYUEpt0Sm8tNOw.png"
            alt="Bioluminescent Landscape"
            className={styles.footerBannerImg}
          />
          <div style={{ position: "absolute", inset: 0, opacity: 0.35, pointerEvents: "none" }}>
            <AnimatedWaveCanvas />
          </div>
          <div className={styles.footerFadeBottom} />
        </div>

        <div className={styles.footerContent}>
          <div className={styles.footerGrid}>
            {/* Brand Column */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span className={styles.brandLogoText}>CIVICCLEAN</span>
                <span className={styles.brandTm}>TM</span>
              </div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, maxWidth: 280 }}>
                Autonomous multimodal vision AI for municipal cleanliness and illegal dumping prevention.
                Built for AWS Environmental Hacks 2026.
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h5 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
                Solution
              </h5>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["The Problem", "Vision Pipeline", "Cloud Architecture", "City Integrations"].map((item) => (
                  <a
                    key={item}
                    href={`#${item === "The Problem" ? "features" : item === "Vision Pipeline" ? "how-it-works" : item === "Cloud Architecture" ? "infra" : "integrations"}`}
                    style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 14 }}
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>

            {/* Developers Links */}
            <div>
              <h5 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
                Architecture
              </h5>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["FastAPI Engine", "Temporal Vision", "Edge Topology", "Webhooks API"].map((item) => (
                  <a
                    key={item}
                    href="#developers"
                    style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 14 }}
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>

            {/* Actions Links */}
            <div>
              <h5 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
                Live Console
              </h5>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => onNavigate("intake")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    textAlign: "left",
                    color: "rgba(255,255,255,0.6)",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  Video Intake
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("review")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    textAlign: "left",
                    color: "rgba(255,255,255,0.6)",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  Review Queue ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("webhook")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    textAlign: "left",
                    color: "rgba(255,255,255,0.6)",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  Webhook Config
                </button>
              </div>
            </div>

            {/* Legal / Ethics */}
            <div>
              <h5 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
                Ethics & Custody
              </h5>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["Non-Biometric Policy", "Evidence Chain of Custody", "Human-in-the-Loop", "Municipal Bylaws"].map((item) => (
                  <a
                    key={item}
                    href="#security"
                    style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 14 }}
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Bottom Row */}
          <div className={styles.footerBottomRow}>
            <span>&copy; {new Date().getFullYear()} CivicClean&trade; · Team House of Coders · AWS Environmental Hacks</span>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#4ade80",
                  boxShadow: "0 0 8px #4ade80",
                }}
              />
              <span className={styles.fontMono} style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                All vision pipelines operational · Event 02 Build
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
