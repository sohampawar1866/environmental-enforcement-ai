import React, { useEffect, useState, useRef } from "react";
import { ArrowRight, X, Shield, Lock, Eye, ShieldCheck } from "lucide-react";
import styles from "./landing.module.css";

interface LandingPageProps {
  onNavigate: (page: "intake" | "review" | "webhook") => void;
  pendingCount: number;
}

// ─── CYCLING WORDS FOR HERO ───
const HERO_WORDS = ["detects", "verifies", "enforces", "scales"];

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
    { name: "Capabilities", href: "#features" },
    { name: "Process", href: "#how-it-works" },
    { name: "Infra", href: "#infra" },
    { name: "Integrations", href: "#integrations" },
    { name: "Security", href: "#security" },
  ];

  const processSteps = [
    {
      number: "01",
      title: "Ingest",
      subtitle: "camera streams & citizen uploads",
      description: "Connect RTSP feeds, dashcams, or resident drone footage. Videos are ingested via multipart upload or automated webhook.",
      code: `// Connect Municipal Stream
const stream = await civicClean.connect({
  source: 'rtsp://cam-04.city-surveillance.net/live',
  zone: 'North Metro District',
  retentionHours: 72
});`,
    },
    {
      number: "02",
      title: "Analyze",
      subtitle: "multimodal vision AI pipeline",
      description: "Gemini Flash vision models extract offending frames, track dumping vehicles, read license plates, and match against municipal codes.",
      code: `// Multimodal Frame Adjudication
const event = await stream.detectViolations({
  regulations: ['§14-22.1 Illegal Dumping', '§18-4 Littering'],
  confidenceFloor: 0.85,
  extractLicensePlates: true
});`,
    },
    {
      number: "03",
      title: "Enforce",
      subtitle: "statutory notices & dispatch",
      description: "Generate court-ready citation dossiers, auto-assemble evidence packages, or dispatch municipal sanitation crews in real time.",
      code: `// Court-Ready Citation Package
const citation = await event.createCitationDossier({
  signOffOfficer: 'Auto-Triage / Officer #412',
  statuteNotice: 'Notice of Violation #2026-8841',
  exportFormats: ['PDF', 'JSON', 'GIS-Shapefile']
});`,
    },
  ];

  const securityItems = [
    {
      icon: Shield,
      title: "Isolated execution",
      description: "Every video analysis runs in an isolated cryptographic container.",
      image: "/images/isolated.jpg",
    },
    {
      icon: Lock,
      title: "Encrypted evidence",
      description: "All footage, frames, and metadata encrypted AES-256 in transit and at rest.",
      image: "/images/encrypted.jpg",
    },
    {
      icon: Eye,
      title: "Full audit trails",
      description: "Immutable append-only ledger for every AI prediction and officer review.",
      image: "/images/audit.jpg",
    },
    {
      icon: ShieldCheck,
      title: "Permission boundaries",
      description: "Strict CJIS and municipal statutory access controls by design.",
      image: "/images/permissions.jpg",
    },
  ];

  const regions = [
    { name: "North Precinct", nodes: 12, status: "operational" },
    { name: "Central Transit", nodes: 8, status: "operational" },
    { name: "Industrial Corridor", nodes: 6, status: "operational" },
    { name: "Waterfront Sector", nodes: 3, status: "operational" },
  ];

  const integrations = [
    { name: "ArcGIS / Esri", category: "Spatial GIS" },
    { name: "Cityworks", category: "Work Orders" },
    { name: "Tyler Tech", category: "Municipal ERP" },
    { name: "Axon Evidence", category: "Digital Evidence" },
    { name: "AWS S3 Vault", category: "Cloud Storage" },
    { name: "Slack Alerts", category: "Team Triage" },
    { name: "Webhooks API", category: "Real-time Events" },
    { name: "Twilio SMS", category: "Citizen Alerts" },
    { name: "Snowflake", category: "Data Warehouse" },
    { name: "Google Cloud", category: "Vision Compute" },
  ];

  return (
    <div className={styles.landingRoot}>
      {/* ══════════════════════════════════════════════════════════════════════
          1. NAVIGATION
          ══════════════════════════════════════════════════════════════════════ */}
      <header className={`${styles.headerFixed} ${isScrolled ? styles.headerScrolled : ""}`}>
        <nav className={`${styles.navContainer} ${isScrolled || isMobileMenuOpen ? styles.navContainerScrolled : ""}`}>
          {/* Brand Logo */}
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
              <span>Submit Video</span>
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
                style={{ fontSize: 36, color: "#fff", textDecoration: "none" }}
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
              Submit Video Intake
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
            <span className={styles.fontMono}>
              Autonomous AI vision for municipal cleanliness
            </span>
          </div>

          <h1 className={styles.heroTitle}>
            <span style={{ display: "block" }}>Municipal vision,</span>
            <span style={{ display: "block" }}>
              agents that{" "}
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
              maxWidth: 580,
              margin: "0 0 36px",
            }}
          >
            Deploy autonomous vision models across traffic cameras, patrol dashcams, and resident reports.
            Transform hours of surveillance into instant, court-ready citations with zero manual scrubbing.
          </p>

          <div className={styles.heroActions}>
            <button
              type="button"
              onClick={() => onNavigate("intake")}
              className={styles.btnPrimaryPill}
              style={{ padding: "14px 32px", fontSize: "15px" }}
            >
              <span>Deploy Intake Agent</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => onNavigate("review")}
              className={styles.btnSecondaryPill}
              style={{ padding: "14px 28px", fontSize: "15px" }}
            >
              <span>Review Audit Queue</span>
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
            { value: "99.8%", label: "citation accuracy" },
            { value: "<450ms", label: "frame inference latency" },
            { value: "14,000+", label: "violations verified" },
          ].map((stat) => (
            <div key={stat.label} className={styles.statItem}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          3. CAPABILITIES / FEATURES SECTION
          ══════════════════════════════════════════════════════════════════════ */}
      <section id="features" className={styles.sectionWrapper}>
        <div className={styles.sectionHeaderGrid}>
          <div>
            <div className={styles.sectionEyebrow}>
              <span style={{ width: 48, height: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
              <span className={styles.fontMono}>Capabilities</span>
            </div>
            <h2 className={styles.sectionTitle}>
              Intelligent
              <br />
              <span style={{ color: "rgba(255,255,255,0.4)" }}>workers.</span>
            </h2>
          </div>

          <div>
            <p className={styles.sectionSubLead}>
              Deploy autonomous AI vision agents that execute complex video triage across distributed municipal infrastructure.
              Zero supervision required.
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
                Autonomous Video Analysis
              </h3>
              <p
                style={{
                  fontSize: "17px",
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.65)",
                  maxWidth: 480,
                  marginBottom: 36,
                }}
              >
                Vision models continuously scan municipal feeds, traffic footage, and resident uploads for illegal dumping, littering, and code violations.
              </p>
              <div>
                <span className={styles.fontDisplay} style={{ fontSize: "clamp(2.8rem, 4.5vw, 4rem)", color: "#fff" }}>
                  99.8%
                </span>
                <span
                  className={styles.fontMono}
                  style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 6 }}
                >
                  task completion accuracy
                </span>
              </div>
            </div>
          </div>

          <div className={styles.bentoVisualRight}>
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Upscaled%20Image%20%2812%29-ng3RrNnsPMJ5CrtOjcPTmhHg01W11q.png"
              alt="Vision Model Processing"
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
              title: "Evidence Dossier Assembly",
              description: "Automated keyframe capture, license plate OCR, object bounding boxes, and timestamped forensic reports.",
              stat: "100%",
              label: "tamper-evident verification",
            },
            {
              number: "03",
              title: "Human-in-the-Loop Triage",
              description: "Intelligent triage routing flags high-confidence notices directly to officers while queuing edge cases for one-click review.",
              stat: "4.8x",
              label: "faster clearance speed",
            },
            {
              number: "04",
              title: "Statutory Compliance Sandboxing",
              description: "Each investigation runs in an isolated cryptographic container with immutable audit trails and legal precedent tagging.",
              stat: "0",
              label: "unverified citations",
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
                Process
              </span>
            </div>

            <h2 className={styles.sectionTitle}>
              <span style={{ display: "block" }}>Define.</span>
              <span style={{ display: "block", color: "rgba(255,255,255,0.35)" }}>Deploy.</span>
              <span style={{ display: "block", color: "rgba(255,255,255,0.15)" }}>Scale.</span>
            </h2>
          </div>

          <div className={styles.processTreeWrap}>
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/tree-uAia6REvB137CQyHFCf0za3O6h2zKO.png"
              alt="Process Network Tree"
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
              <span>CIVICCLEAN_EXECUTION_STREAM.ts</span>
              <span style={{ color: "#eca8d6" }}>STEP {processSteps[activeStep].number} // LIVE</span>
            </div>
            <pre className={styles.devCodeBody}>
              <code>{processSteps[activeStep].code}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          5. INFRASTRUCTURE SECTION
          ══════════════════════════════════════════════════════════════════════ */}
      <section id="infra" className={styles.sectionWrapper}>
        <div className={styles.infraGridHeader}>
          <div className={styles.infraGlobeWrap}>
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/world-3i68QNWJwmO7W19ztZWbevAwJQHzYL.png"
              alt="Global Network Sphere"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

          <div>
            <div className={styles.sectionEyebrow}>
              <span style={{ width: 48, height: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
              <span className={styles.fontMono}>Global infrastructure</span>
            </div>

            <h2 className={styles.sectionTitle}>
              Municipal by
              <br />
              <span style={{ color: "rgba(255,255,255,0.4)" }}>default.</span>
            </h2>

            <p className={styles.sectionSubLead} style={{ marginTop: 24, maxWidth: 540 }}>
              CivicClean vision pipelines deploy across edge municipal servers and cloud GPU clusters.
              Sub-50ms latency for real-time traffic, public spaces, and mobile dashcams.
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
                  jurisdictions
                </span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.6)", maxWidth: 440, marginTop: 16, fontSize: "15px" }}>
                Inference nodes distributed across municipal sectors for maximum throughput, edge privacy, and zero data leakage.
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
              <span className={styles.fontDisplay} style={{ fontSize: "48px", color: "#fff" }}>
                99.99%
              </span>
              <span style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
                Municipal Uptime SLA
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
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{region.nodes} active nodes</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          6. METRICS SECTION (ANIMATED COUNTERS)
          ══════════════════════════════════════════════════════════════════════ */}
      <section className={styles.sectionWrapper} style={{ paddingTop: 32, paddingBottom: 64 }}>
        <div style={{ marginBottom: 48 }}>
          <div className={styles.sectionEyebrow}>
            <span style={{ width: 48, height: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
            <span className={styles.fontMono}>Live telemetry</span>
          </div>
          <h2 className={styles.sectionTitle}>
            Enforcement
            <br />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>at scale.</span>
          </h2>
        </div>

        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricValue}>
              <AnimatedNumber end={12847392} />
            </div>
            <span className={styles.metricLabel}>Frames analyzed today</span>
            <span className={styles.metricSublabel}>by 34 active cameras across city</span>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricValue}>
              <AnimatedNumber end={99} suffix=".99%" />
            </div>
            <span className={styles.metricLabel}>Detection availability</span>
            <span className={styles.metricSublabel}>across all municipal precincts</span>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricValue}>
              <AnimatedNumber end={340} prefix="<" suffix="ms" />
            </div>
            <span className={styles.metricLabel}>Average inference latency</span>
            <span className={styles.metricSublabel}>p99 keyframe classification</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          7. INTEGRATIONS SECTION
          ══════════════════════════════════════════════════════════════════════ */}
      <section id="integrations" className={styles.sectionWrapper}>
        <div style={{ marginBottom: 48 }}>
          <div className={styles.sectionEyebrow}>
            <span style={{ width: 48, height: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
            <span className={styles.fontMono}>Integrations</span>
          </div>
          <h2 className={styles.sectionTitle}>
            Works with your
            <br />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>existing stack.</span>
          </h2>
          <p className={styles.sectionSubLead} style={{ marginTop: 24, maxWidth: 560 }}>
            CivicClean connects natively with municipal GIS portals, dispatch systems, law enforcement repositories, and civic reporting hotlines.
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
          8. SECURITY SECTION
          ══════════════════════════════════════════════════════════════════════ */}
      <section id="security" className={styles.sectionWrapper}>
        <div style={{ marginBottom: 64 }}>
          <div className={styles.sectionEyebrow}>
            <span style={{ width: 48, height: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
            <span className={styles.fontMono}>Security & Chain of Custody</span>
          </div>
          <h2 className={styles.sectionTitle}>
            Autonomous,
            <br />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>not uncontrolled.</span>
          </h2>
          <p className={styles.sectionSubLead} style={{ marginTop: 24, maxWidth: 580 }}>
            Every violation dossier is cryptographically stamped. Enterprise-grade security ensures evidence meets strict standards for municipal and county courts.
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
                Active Protection
              </span>
              <div style={{ marginTop: 24 }}>
                <span className={styles.fontDisplay} style={{ fontSize: "clamp(5rem, 8vw, 7.5rem)", color: "#fff", lineHeight: 1 }}>
                  0
                </span>
                <span style={{ display: "block", color: "rgba(255,255,255,0.6)", marginTop: 8 }}>
                  Chain-of-custody discrepancies or breaches
                </span>
              </div>
            </div>

            {/* Certifications row */}
            <div style={{ position: "absolute", bottom: 24, left: 36, right: 36, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["CJIS Compliant", "SOC 2 Type II", "ISO 27001", "FedRAMP Ready", "GDPR / CCPA"].map((cert) => (
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
          9. DEVELOPERS / SDK SECTION
          ══════════════════════════════════════════════════════════════════════ */}
      <section id="developers" className={styles.sectionWrapper}>
        <div style={{ marginBottom: 48 }}>
          <div className={styles.sectionEyebrow}>
            <span style={{ width: 48, height: 1, backgroundColor: "rgba(255,255,255,0.3)" }} />
            <span className={styles.fontMono}>Developer SDK</span>
          </div>
          <h2 className={styles.sectionTitle}>
            Code your agents.
            <br />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>Or let them code.</span>
          </h2>
        </div>

        <div className={styles.devGrid}>
          {/* Features list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              {
                title: "TypeScript & Python Native",
                desc: "Full type safety for video inference configs, incident payloads, and evidence schema exports.",
              },
              {
                title: "Streaming Keyframe Telemetry",
                desc: "Receive real-time WebSocket frames as models track vehicle trajectories and waste objects.",
              },
              {
                title: "Multi-Model Vision Routing",
                desc: "Gemini Flash, YOLOv11, local edge ONNX pipelines, or custom fine-tuned municipal weights.",
              },
              {
                title: "Local Testing Sandbox",
                desc: "Simulate camera streams and test citation rules locally before deploying to production precincts.",
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
              <span>civicclean-agent.ts</span>
              <span className={styles.fontMono}>npm i @civicclean/sdk</span>
            </div>
            <pre className={styles.devCodeBody}>
              <code>{`import { CivicClean } from "@civicclean/sdk";

// Initialize vision enforcement agent
const agent = new CivicClean.VisionAgent({
  apiKey: process.env.CIVICCLEAN_API_KEY,
  jurisdiction: "Valley Metro Public Works",
  statutes: ["§14-22.1 Illegal Dumping", "§18-4 Littering"],
  confidenceFloor: 0.85
});

// Stream from precinct traffic camera
const feed = agent.watch("rtsp://camera-04.metro.gov/live");

feed.on("violation", async (incident) => {
  console.log(\`Detected \${incident.wasteClass} at \${incident.timestamp}\`);
  
  // Auto-assemble court-ready evidence dossier
  const dossier = await incident.generateEvidenceDossier({
    extractPlates: true,
    includeKeyframes: 5
  });

  // Dispatch to officer review queue
  await dossier.submitForTriage();
});`}</code>
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
                Ready to eliminate
                <br />
                <span style={{ color: "rgba(255,255,255,0.5)" }}>illegal dumping?</span>
              </h2>

              <p style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", margin: "24px 0 40px", maxWidth: 540 }}>
                Join municipal enforcement teams automating complex visual triage with CivicClean AI.
                Deploy your first intake feed in minutes.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                <button
                  type="button"
                  onClick={() => onNavigate("intake")}
                  className={styles.btnPrimaryPill}
                  style={{ padding: "14px 32px", fontSize: 15 }}
                >
                  <span>Submit Video Intake</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate("review")}
                  className={styles.btnSecondaryPill}
                  style={{ padding: "14px 28px", fontSize: 15 }}
                >
                  <span>Open Review Queue</span>
                  {pendingCount > 0 && (
                    <span style={{ backgroundColor: "#eca8d6", color: "#000", padding: "1px 6px", borderRadius: "9999px", fontSize: 11, fontWeight: 700 }}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              </div>

              <span className={styles.fontMono} style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 24 }}>
                Open-source multimodal AI vision for public works & municipal enforcement
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
          13. FOOTER SECTION
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
                Autonomous AI vision for municipal cleanliness and environmental code enforcement.
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h5 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
                Product
              </h5>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["Capabilities", "Process", "Infrastructure", "Integrations"].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
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
                Developers
              </h5>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["SDK Docs", "API Reference", "Webhooks", "GitHub Repo"].map((item) => (
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
                Console
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

            {/* Legal */}
            <div>
              <h5 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
                Compliance
              </h5>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["CJIS Security", "Privacy Policy", "Terms of Service", "Audit Protocol"].map((item) => (
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
            <span>&copy; {new Date().getFullYear()} CivicClean&trade; AI. All rights reserved.</span>

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
                All municipal systems operational · v2.4.1
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
