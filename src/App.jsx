import React, {
  useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle,
} from "react";
import {
  Sparkles, Heart, Camera, Lock, User, Instagram, LogOut, Download,
  Users, Loader2, Pencil, ArrowRight, Check, Eye, EyeOff, Home, Mail,
} from "lucide-react";
import { supabase } from "./supabaseClient";

/* ============================== canvas helpers ============================== */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRectPath(ctx, x, y, w, h, r) {
  if (typeof r === "number") r = { tl: r, tr: r, br: r, bl: r };
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.arcTo(x + w, y, x + w, y + r.tr, r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.arcTo(x + w, y + h, x + w - r.br, y + h, r.br);
  ctx.lineTo(x + r.bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - r.bl, r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.arcTo(x, y, x + r.tl, y, r.tl);
  ctx.closePath();
}

function drawImageCover(ctx, img, x, y, w, h) {
  const ir = img.width / img.height;
  const br = w / h;
  let sx, sy, sw, sh;
  if (ir > br) { sh = img.height; sw = sh * br; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / br; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawStar4(ctx, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(s * 0.15, -s * 0.15, s, 0);
  ctx.quadraticCurveTo(s * 0.15, s * 0.15, 0, s);
  ctx.quadraticCurveTo(-s * 0.15, s * 0.15, -s, 0);
  ctx.quadraticCurveTo(-s * 0.15, -s * 0.15, 0, -s);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawSparkles(ctx, W, H, seed, count) {
  const rand = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = rand() * W, y = rand() * H, r = rand() * 1.8 + 0.4, op = rand() * 0.55 + 0.15;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${op})`;
    ctx.fill();
  }
  for (let i = 0; i < 9; i++) {
    const x = rand() * W, y = rand() * H, s = rand() * 6 + 4;
    drawStar4(ctx, x, y, s, `rgba(255,255,255,${rand() * 0.45 + 0.3})`);
  }
}

function drawBolt(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(r / 24, r / 24);
  ctx.beginPath();
  ctx.moveTo(2, -20);
  ctx.lineTo(-10, 2);
  ctx.lineTo(-1, 2);
  ctx.lineTo(-4, 20);
  ctx.lineTo(11, -4);
  ctx.lineTo(1, -4);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawBoltBadge(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.stroke();
  drawBolt(ctx, cx, cy, r * 0.68, "#2b0620");
}

function drawHeart(ctx, cx, cy, size) {
  const w = size, h = size * 0.92;
  const heartPath = (scale) => {
    const ww = w * scale, hh = h * scale;
    const x = cx - ww / 2, y = cy - hh / 2;
    const p = new Path2D();
    p.moveTo(x + ww / 2, y + hh / 4);
    p.bezierCurveTo(x + ww / 2, y, x, y, x, y + hh / 4);
    p.bezierCurveTo(x, y + hh / 2, x + ww / 2, y + (hh * 3) / 4, x + ww / 2, y + hh);
    p.bezierCurveTo(x + ww / 2, y + (hh * 3) / 4, x + ww, y + hh / 2, x + ww, y + hh / 4);
    p.bezierCurveTo(x + ww, y, x + ww / 2, y, x + ww / 2, y + hh / 4);
    p.closePath();
    return p;
  };

  ctx.save();
  // soft drop shadow, then a white die-cut sticker edge behind the gem
  ctx.shadowColor = "rgba(120,0,60,0.45)";
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetY = size * 0.06;
  ctx.fillStyle = "#ffffff";
  ctx.fill(heartPath(1.16));
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // gem body
  const grad = ctx.createLinearGradient(cx, cy - h / 2, cx, cy + h / 2);
  grad.addColorStop(0, "#ff9ed4");
  grad.addColorStop(0.45, "#ff2f8f");
  grad.addColorStop(1, "#a8004f");
  ctx.fillStyle = grad;
  ctx.fill(heartPath(1));
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = Math.max(1, size * 0.03);
  ctx.stroke(heartPath(1));

  // two glints for a faceted, glossy look
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.18, cy - h * 0.22, w * 0.11, h * 0.16, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.arc(cx + w * 0.12, cy - h * 0.04, w * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCrown(ctx, cx, cy, w) {
  const h = w * 0.55;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(-w / 2, h * 0.35);
  ctx.lineTo(-w / 2, -h * 0.15);
  ctx.lineTo(-w * 0.28, h * 0.12);
  ctx.lineTo(0, -h * 0.55);
  ctx.lineTo(w * 0.28, h * 0.12);
  ctx.lineTo(w / 2, -h * 0.15);
  ctx.lineTo(w / 2, h * 0.35);
  ctx.closePath();
  ctx.fillStyle = "#ffd76a";
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "#a8720a";
  ctx.stroke();
  ctx.fillStyle = "#ff2f8f";
  [[-w / 2, -h * 0.15], [0, -h * 0.55], [w / 2, -h * 0.15]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.arc(px, py, w * 0.05, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawShield(ctx, cx, cy, size) {
  ctx.save();
  ctx.translate(cx, cy);
  const w = size, h = size * 1.15;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.bezierCurveTo(w / 2, -h / 2, w / 2, -h / 4, w / 2, 0);
  ctx.bezierCurveTo(w / 2, h / 3, w / 4, h / 2 - 4, 0, h / 2);
  ctx.bezierCurveTo(-w / 4, h / 2 - 4, -w / 2, h / 3, -w / 2, 0);
  ctx.bezierCurveTo(-w / 2, -h / 4, -w / 2, -h / 2, 0, -h / 2);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, "#331030");
  g.addColorStop(1, "#150111");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffd76a";
  ctx.stroke();
  drawBolt(ctx, 0, 6, size * 0.26, "#ffd76a");
  drawCrown(ctx, 0, -h / 2 - 10, w * 0.5);
  ctx.font = "700 12px Tajawal, sans-serif";
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.fillText("حماية دائمة", 0, h / 2 - 16);
  ctx.restore();
}

function drawPlanet(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  const glow = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.8);
  glow.addColorStop(0, "rgba(124,249,255,0.32)");
  glow.addColorStop(1, "rgba(124,249,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
  ctx.fill();

  const sphereGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  sphereGrad.addColorStop(0, "#6b1450");
  sphereGrad.addColorStop(0.6, "#2b0620");
  sphereGrad.addColorStop(1, "#100010");
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = sphereGrad;
  ctx.fill();

  const rand = mulberry32(7);
  for (let i = 0; i < 40; i++) {
    const a = rand() * Math.PI * 2, rr = rand() * r * 0.9;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, rand() * 1.5 + 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,111,216,${rand() * 0.5 + 0.2})`;
    ctx.fill();
  }

  ctx.save();
  ctx.rotate(-0.35);
  ctx.scale(1, 0.32);
  const ringGrad = ctx.createLinearGradient(-r * 1.7, 0, r * 1.7, 0);
  ringGrad.addColorStop(0, "rgba(124,249,255,0)");
  ringGrad.addColorStop(0.5, "rgba(124,249,255,0.95)");
  ringGrad.addColorStop(1, "rgba(255,111,216,0)");
  ctx.lineWidth = r * 0.14;
  ctx.strokeStyle = ringGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function drawPill(ctx, cx, cy, w, h, text, font, fill, textColor, withHearts) {
  roundRectPath(ctx, cx - w / 2, cy - h / 2, w, h, h / 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.font = font;
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";
  ctx.fillText(text, cx, cy + 1);
  if (withHearts) {
    drawHeart(ctx, cx - w / 2 + h * 0.42, cy, h * 0.5);
    drawHeart(ctx, cx + w / 2 - h * 0.42, cy, h * 0.5);
  }
}

function drawBarcode(ctx, x, y, w, h, seedNum) {
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fill();
  const rand = mulberry32((seedNum || 1) * 31 + 99);
  let cx = x + 10;
  const maxX = x + w - 10;
  ctx.fillStyle = "#1a0410";
  while (cx < maxX - 4) {
    const bw = rand() > 0.7 ? 3 : 1.4;
    if (rand() > 0.35) ctx.fillRect(cx, y + 8, bw, h - 16);
    cx += bw + 2.2;
  }
}

const GENDER_LABELS = {
  male: { title: "مواطن", valid: "صالح", active: "نشط", member: "عضو" },
  female: { title: "مواطنة", valid: "صالحة", active: "نشطة", member: "عضوة" },
};

// NOTE: field names here (display_name, id_number, photo_url, public_gallery)
// match the Postgres column names in supabase/schema.sql on purpose, so the
// row you get back from Supabase can be passed straight into this function.
function drawCard(ctx, W, H, profile) {
  ctx.clearRect(0, 0, W, H);
  ctx.direction = "rtl";

  roundRectPath(ctx, 0, 0, W, H, 32);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#ff2fa8");
  bg.addColorStop(0.55, "#c2007f");
  bg.addColorStop(1, "#3d0030");
  ctx.fillStyle = bg;
  ctx.fill();

  ctx.save();
  roundRectPath(ctx, 0, 0, W, H, 32);
  ctx.clip();
  drawSparkles(ctx, W, H, (profile.id_number || 1) * 13 + 7, 70);
  ctx.restore();

  roundRectPath(ctx, 16, 16, W - 32, H - 32, 26);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.stroke();
  roundRectPath(ctx, 24, 24, W - 48, H - 48, 22);
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.stroke();

  drawBoltBadge(ctx, 64, 64, 24);
  drawBoltBadge(ctx, W - 64, 64, 24);

  ctx.font = "800 32px Changa, sans-serif";
  ctx.fillStyle = "#2b0620";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("بطاقة مواطنة برق برق", W / 2, 104);

  const pw = 252, ph = 252, px = (W - pw) / 2, py = 136;
  roundRectPath(ctx, px, py, pw, ph, 20);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fill();
  if (profile.photoImg) {
    ctx.save();
    roundRectPath(ctx, px, py, pw, ph, 20);
    ctx.clip();
    drawImageCover(ctx, profile.photoImg, px, py, pw, ph);
    ctx.restore();
  } else {
    drawHeart(ctx, px + pw / 2, py + ph / 2, pw * 0.4);
  }
  roundRectPath(ctx, px, py, pw, ph, 20);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#ffb3e6";
  ctx.stroke();

  drawShield(ctx, W - 92, 100, 74);

  ctx.font = "800 60px Changa, sans-serif";
  ctx.fillStyle = "#2b0620";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const idText = String(profile.id_number ?? 1).padStart(3, "0");
  ctx.fillText(idText, W / 2, 480);
  drawBolt(ctx, W / 2 - 130, 462, 20, "#ffd76a");
  drawBolt(ctx, W / 2 + 130, 462, 20, "#ffd76a");

  drawPill(ctx, W / 2, 555, 340, 58, profile.display_name || "—",
    "700 26px Tajawal, sans-serif", "rgba(255,255,255,0.92)", "#2b0620", true);

  let badgeStart = 650;
  if (profile.instagram) {
    ctx.font = "500 20px Tajawal, sans-serif";
    ctx.fillStyle = "rgba(43,6,32,0.85)";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("@" + profile.instagram.replace(/^@/, ""), W / 2, 605);
  }

  const L = GENDER_LABELS[profile.gender === "male" ? "male" : "female"];
  const badges = [
    `${L.title} ${L.valid} في كوكب برق برق`,
    `${L.member} ${L.active} دائماً`,
    `${L.title} برق برق مدى الحياة`,
  ];
  let by = badgeStart;
  badges.forEach((b) => {
    drawPill(ctx, W / 2, by, 400, 42, b, "600 17px Tajawal, sans-serif",
      "rgba(20,2,16,0.34)", "#ffffff", false);
    by += 50;
  });

  drawPlanet(ctx, W / 2, 890, 78);

  drawBarcode(ctx, 56, H - 92, W - 112, 46, profile.id_number);

  ctx.font = "500 15px Tajawal, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.textAlign = "center";
  ctx.fillText("عالم برق برق ✦ صالحة إلى الأبد", W / 2, H - 24);
}

/* ============================== image resize helper ============================== */

// Shrinks the uploaded photo client-side and hands back both a Blob (to
// upload to Supabase Storage) and a dataURL (for an instant local preview).
function resizeImageFile(file, maxDim = 640) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height); height = maxDim;
        }
        const c = document.createElement("canvas");
        c.width = width; c.height = height;
        c.getContext("2d").drawImage(img, 0, 0, width, height);
        c.toBlob(
          (blob) => resolve({ blob, dataUrl: c.toDataURL("image/jpeg", 0.85) }),
          "image/jpeg",
          0.85
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadPhoto(userId, blob) {
  const path = `${userId}/photo.jpg`;
  const { error } = await supabase.storage
    .from("card-photos")
    .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
  if (error) throw error;
  const { data } = supabase.storage.from("card-photos").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`; // cache-bust so edits show immediately
}

/* ============================== small UI atoms ============================== */

function TextField({ icon: Icon, label, ...props }) {
  return (
    <label style={{ display: "block", marginBottom: 14, textAlign: "right" }}>
      <span style={{ display: "block", fontSize: 13, color: "#ffd7f0", marginBottom: 6, fontWeight: 600 }}>
        {label}
      </span>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)",
        borderRadius: 999, padding: "10px 16px",
      }}>
        {Icon && <Icon size={16} color="#ffb3e6" style={{ flexShrink: 0 }} />}
        <input {...props} dir="rtl"
          style={{
            background: "transparent", border: "none", outline: "none", color: "#fff",
            fontFamily: "Tajawal, sans-serif", fontSize: 15, width: "100%",
          }} />
      </div>
    </label>
  );
}

function PillButton({ children, onClick, variant = "primary", disabled, type = "button", style }) {
  const base = {
    border: "none", borderRadius: 999, padding: "12px 22px", fontFamily: "Tajawal, sans-serif",
    fontWeight: 700, fontSize: 15, cursor: disabled ? "default" : "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    opacity: disabled ? 0.6 : 1, transition: "transform 0.12s ease",
  };
  const variants = {
    primary: { background: "linear-gradient(135deg,#ff5fc4,#c2007f)", color: "#fff", boxShadow: "0 6px 18px rgba(194,0,127,0.45)" },
    ghost: { background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)" },
    gold: { background: "linear-gradient(135deg,#ffe8a3,#ffb84d)", color: "#3d0030" },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

function GenderToggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 14, justifyContent: "flex-end" }}>
      {[{ v: "female", l: "مواطنة" }, { v: "male", l: "مواطن" }].map((opt) => (
        <button key={opt.v} type="button" onClick={() => onChange(opt.v)}
          style={{
            padding: "8px 16px", borderRadius: 999, fontFamily: "Tajawal, sans-serif", fontWeight: 700,
            fontSize: 13, cursor: "pointer",
            border: value === opt.v ? "1px solid #ffd76a" : "1px solid rgba(255,255,255,0.25)",
            background: value === opt.v ? "rgba(255,215,106,0.18)" : "rgba(255,255,255,0.06)",
            color: value === opt.v ? "#ffd76a" : "#fff",
          }}>
          {opt.l}
        </button>
      ))}
    </div>
  );
}

function Starfield() {
  const stars = useMemo(() => Array.from({ length: 55 }).map((_, i) => ({
    id: i, left: Math.random() * 100, top: Math.random() * 100,
    size: Math.random() * 2 + 0.6, delay: Math.random() * 4, dur: Math.random() * 3 + 2.5,
  })), []);
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {stars.map((s) => (
        <div key={s.id} style={{
          position: "absolute", left: `${s.left}%`, top: `${s.top}%`,
          width: s.size, height: s.size, borderRadius: "50%", background: "#fff",
          opacity: 0.6, animation: `bb-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

function TiltCard({ children }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ transform: "perspective(900px) rotateX(0) rotateY(0) scale(1)" });
  const [glare, setGlare] = useState({ opacity: 0 });

  const handleMove = (e) => {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (py - 0.5) * -12;
    const ry = (px - 0.5) * 12;
    setTilt({ transform: `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.015)` });
    setGlare({ opacity: 0.3, background: `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.6), transparent 55%)` });
  };
  const handleLeave = () => {
    setTilt({ transform: "perspective(900px) rotateX(0) rotateY(0) scale(1)" });
    setGlare({ opacity: 0 });
  };

  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave}
      style={{ position: "relative", borderRadius: 32, transition: "transform 0.15s ease-out", ...tilt }}>
      {children}
      <div style={{ position: "absolute", inset: 0, borderRadius: 32, pointerEvents: "none", transition: "opacity 0.2s", ...glare }} />
    </div>
  );
}

/* ============================== card canvas ============================== */

const CardCanvas = forwardRef(function CardCanvas({ profile, fontsReady, maxWidth = 340 }, ref) {
  const canvasRef = useRef(null);
  const [photoImg, setPhotoImg] = useState(null);
  const W = 640, H = 1080;

  useEffect(() => {
    let cancelled = false;
    if (!profile.photo_url) { setPhotoImg(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous"; // needed so the canvas can export to PNG later
    img.onload = () => { if (!cancelled) setPhotoImg(img); };
    img.onerror = () => { if (!cancelled) setPhotoImg(null); };
    img.src = profile.photo_url;
    return () => { cancelled = true; };
  }, [profile.photo_url]);

  useEffect(() => {
    if (!fontsReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCard(ctx, W, H, { ...profile, photoImg });
  }, [profile, photoImg, fontsReady]);

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `barq-barq-${profile.id_number || "card"}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (e) {
        alert("تعذر تنزيل الصورة، جرّب مرة أخرى.");
      }
    },
  }));

  return (
    <canvas ref={canvasRef} style={{
      width: "100%", maxWidth, height: "auto", display: "block",
      borderRadius: 32, boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
    }} />
  );
});

/* ============================== photo picker ============================== */

function PhotoPicker({ preview, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { blob, dataUrl } = await resizeImageFile(file);
      onChange(blob, dataUrl);
    } catch (err) { /* ignore */ }
    setBusy(false);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, justifyContent: "flex-end" }}>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 13, color: "#ffd7f0", fontWeight: 600, marginBottom: 6 }}>صورتك</div>
        <PillButton variant="ghost" onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 size={16} className="bb-spin" /> : <Camera size={16} />}
          {preview ? "تغيير الصورة" : "رفع صورة"}
        </PillButton>
      </div>
      <div style={{
        width: 64, height: 64, borderRadius: 16, overflow: "hidden",
        background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {preview
          ? <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <Heart size={24} color="#ff6fb8" fill="#ff6fb8" />}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
    </div>
  );
}

/* ============================== views ============================== */

function Landing({ onCreate, onLogin, onGallery }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px" }}>
      <h1 style={{
        fontFamily: "Changa, sans-serif", fontWeight: 800, fontSize: 34, color: "#fff",
        margin: "0 0 10px",
      }}>عالم برق برق</h1>
      <p style={{ color: "#ffd7f0", fontFamily: "Tajawal, sans-serif", fontSize: 15, maxWidth: 340, margin: "0 auto 32px", lineHeight: 1.8 }}>
        اصنع بطاقة مواطنتك الخاصة، بصورتك واسمك ورقمك الرسمي، وانضم لعالم القلوب والنجوم
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <PillButton onClick={onCreate} style={{ width: 240 }}>
          <Sparkles size={17} /> أنشئ بطاقتك الآن
        </PillButton>
        <PillButton variant="ghost" onClick={onLogin} style={{ width: 240 }}>
          <User size={17} /> لدي حساب بالفعل
        </PillButton>
        <PillButton variant="ghost" onClick={onGallery} style={{ width: 240 }}>
          <Users size={17} /> معرض المواطنين
        </PillButton>
      </div>
    </div>
  );
}

function AuthCard({ title, children, onBack }) {
  return (
    <div style={{ padding: "28px 22px", maxWidth: 380, margin: "0 auto" }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", color: "#ffd7f0", display: "flex", alignItems: "center",
        gap: 6, fontFamily: "Tajawal, sans-serif", fontSize: 14, cursor: "pointer", marginBottom: 18, padding: 0,
      }}>
        <ArrowRight size={16} /> رجوع
      </button>
      <div style={{
        background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 28, padding: "26px 22px", backdropFilter: "blur(10px)",
      }}>
        <h2 style={{
          fontFamily: "Changa, sans-serif", fontWeight: 800, fontSize: 22, color: "#fff",
          margin: "0 0 20px", textAlign: "center",
        }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function RegisterView({ onBack, onDone }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [instagram, setInstagram] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("female");
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [publicGallery, setPublicGallery] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    const uname = username.trim().toLowerCase();
    if (!email.trim() || !password || !uname || !displayName.trim()) {
      setError("البريد الإلكتروني واسم المستخدم والاسم وكلمة المرور كلها مطلوبة");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    setBusy(true);
    try {
      const { data: existing } = await supabase
        .from("citizens").select("id").eq("username", uname).maybeSingle();
      if (existing) {
        setError("اسم المستخدم هذا محجوز، جرّب اسمًا آخر");
        setBusy(false);
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(), password,
      });
      if (signUpError) throw signUpError;

      const user = signUpData.user;
      if (!user || !signUpData.session) {
        setError("تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيده ثم سجّل الدخول.");
        setBusy(false);
        return;
      }

      let photo_url = null;
      if (photoBlob) {
        try { photo_url = await uploadPhoto(user.id, photoBlob); }
        catch (e) { /* card still works without a photo */ }
      }

      const { data: inserted, error: insertError } = await supabase
        .from("citizens")
        .insert({
          id: user.id, username: uname, display_name: displayName.trim(),
          instagram: instagram.trim().replace(/^@/, ""), gender, photo_url,
          public_gallery: publicGallery,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      onDone(inserted);
    } catch (err) {
      setError(err.message || "حدث خطأ غير متوقع، حاول مرة أخرى");
    }
    setBusy(false);
  };

  return (
    <AuthCard title="أنشئ بطاقتك" onBack={onBack}>
      <PhotoPicker preview={photoPreview}
        onChange={(blob, dataUrl) => { setPhotoBlob(blob); setPhotoPreview(dataUrl); }} />
      <TextField icon={User} label="الاسم الذي يظهر على البطاقة" value={displayName}
        onChange={(e) => setDisplayName(e.target.value)} placeholder="مثال: هناء" />
      <GenderToggle value={gender} onChange={setGender} />
      <TextField icon={User} label="اسم المستخدم" value={username}
        onChange={(e) => setUsername(e.target.value)} placeholder="لتسجيل الدخول لاحقًا" />
      <TextField icon={Mail} label="البريد الإلكتروني" type="email" value={email}
        onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" />
      <TextField icon={Instagram} label="حساب إنستقرام (اختياري)" value={instagram}
        onChange={(e) => setInstagram(e.target.value)} placeholder="بدون @" />
      <div style={{ position: "relative" }}>
        <TextField icon={Lock} label="كلمة المرور" type={showPw ? "text" : "password"}
          value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" />
        <button type="button" onClick={() => setShowPw((s) => !s)}
          style={{ position: "absolute", left: 14, top: 34, background: "none", border: "none", cursor: "pointer" }}>
          {showPw ? <EyeOff size={16} color="#ffb3e6" /> : <Eye size={16} color="#ffb3e6" />}
        </button>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", margin: "6px 0 20px", cursor: "pointer" }}>
        <span style={{ fontSize: 13, color: "#ffd7f0", fontFamily: "Tajawal, sans-serif", textAlign: "right" }}>
          أظهر بطاقتي في معرض المواطنين العام (سيراها الجميع)
        </span>
        <input type="checkbox" checked={publicGallery} onChange={(e) => setPublicGallery(e.target.checked)} />
      </label>
      {error && <div style={{ color: "#ffb3d9", fontSize: 13, marginBottom: 14, textAlign: "center", fontFamily: "Tajawal, sans-serif" }}>{error}</div>}
      <PillButton onClick={submit} disabled={busy} style={{ width: "100%" }}>
        {busy ? <Loader2 size={16} className="bb-spin" /> : <Sparkles size={16} />}
        إنشاء البطاقة
      </PillButton>
    </AuthCard>
  );
}

function LoginView({ onBack, onDone }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      setBusy(false);
      return;
    }
    const { data: profile, error: profErr } = await supabase
      .from("citizens").select("*").eq("id", data.user.id).single();
    if (profErr || !profile) {
      setError("سجّلت الدخول لكن تعذر إيجاد بطاقتك، تواصل مع الدعم");
      setBusy(false);
      return;
    }
    onDone(profile);
    setBusy(false);
  };

  return (
    <AuthCard title="تسجيل الدخول" onBack={onBack}>
      <TextField icon={Mail} label="البريد الإلكتروني" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField icon={Lock} label="كلمة المرور" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <div style={{ color: "#ffb3d9", fontSize: 13, margin: "8px 0", textAlign: "center", fontFamily: "Tajawal, sans-serif" }}>{error}</div>}
      <PillButton onClick={submit} disabled={busy} style={{ width: "100%" }}>
        {busy ? <Loader2 size={16} className="bb-spin" /> : <User size={16} />} دخول
      </PillButton>
    </AuthCard>
  );
}

function EditView({ profile, onBack, onSave }) {
  const [instagram, setInstagram] = useState(profile.instagram || "");
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [gender, setGender] = useState(profile.gender || "female");
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(profile.photo_url || null);
  const [publicGallery, setPublicGallery] = useState(!!profile.public_gallery);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      let photo_url = profile.photo_url;
      if (photoBlob) photo_url = await uploadPhoto(profile.id, photoBlob);

      const { data: updated, error: updErr } = await supabase
        .from("citizens")
        .update({
          display_name: displayName.trim() || profile.display_name,
          instagram: instagram.trim().replace(/^@/, ""),
          gender, photo_url, public_gallery: publicGallery,
        })
        .eq("id", profile.id)
        .select()
        .single();
      if (updErr) throw updErr;

      if (newPassword) {
        if (newPassword.length < 6) throw new Error("كلمة المرور الجديدة قصيرة جدًا");
        const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
        if (pwErr) throw pwErr;
      }

      onSave(updated);
    } catch (err) {
      setError(err.message || "تعذر الحفظ، حاول مرة أخرى");
    }
    setBusy(false);
  };

  return (
    <AuthCard title="تعديل البطاقة" onBack={onBack}>
      <PhotoPicker preview={photoPreview}
        onChange={(blob, dataUrl) => { setPhotoBlob(blob); setPhotoPreview(dataUrl); }} />
      <TextField icon={User} label="الاسم على البطاقة" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      <GenderToggle value={gender} onChange={setGender} />
      <TextField icon={Instagram} label="حساب إنستقرام" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
      <TextField icon={Lock} label="كلمة مرور جديدة (اتركها فارغة لعدم التغيير)" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      <label style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", margin: "6px 0 20px", cursor: "pointer" }}>
        <span style={{ fontSize: 13, color: "#ffd7f0", fontFamily: "Tajawal, sans-serif", textAlign: "right" }}>
          أظهر بطاقتي في معرض المواطنين العام
        </span>
        <input type="checkbox" checked={publicGallery} onChange={(e) => setPublicGallery(e.target.checked)} />
      </label>
      {error && <div style={{ color: "#ffb3d9", fontSize: 13, marginBottom: 14, textAlign: "center", fontFamily: "Tajawal, sans-serif" }}>{error}</div>}
      <PillButton onClick={submit} disabled={busy} style={{ width: "100%" }}>
        {busy ? <Loader2 size={16} className="bb-spin" /> : <Check size={16} />} حفظ التعديلات
      </PillButton>
    </AuthCard>
  );
}

function CardView({ profile, fontsReady, onEdit, onLogout, onGallery }) {
  const cardRef = useRef(null);
  return (
    <div style={{ textAlign: "center", padding: "28px 20px 60px" }}>
      <div style={{ maxWidth: 340, margin: "0 auto 22px" }}>
        <TiltCard>
          <CardCanvas ref={cardRef} profile={profile} fontsReady={fontsReady} maxWidth={340} />
        </TiltCard>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 360, margin: "0 auto" }}>
        <PillButton variant="gold" onClick={() => cardRef.current?.exportPNG()}>
          <Download size={16} /> تنزيل البطاقة
        </PillButton>
        <PillButton variant="ghost" onClick={onEdit}><Pencil size={16} /> تعديل</PillButton>
        <PillButton variant="ghost" onClick={onGallery}><Users size={16} /> المعرض</PillButton>
        <PillButton variant="ghost" onClick={onLogout}><LogOut size={16} /> خروج</PillButton>
      </div>
    </div>
  );
}

function GalleryView({ fontsReady, onBack }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("citizens")
        .select("id_number, display_name, instagram, gender, photo_url, created_at")
        .eq("public_gallery", true)
        .order("created_at", { ascending: false })
        .limit(24);
      if (!cancelled) setItems(error ? [] : data);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ padding: "24px 20px 60px", maxWidth: 900, margin: "0 auto" }}>
      <button onClick={onBack} style={{
        background: "none", border: "none", color: "#ffd7f0", display: "flex", alignItems: "center",
        gap: 6, fontFamily: "Tajawal, sans-serif", fontSize: 14, cursor: "pointer", marginBottom: 18, padding: 0,
      }}>
        <ArrowRight size={16} /> رجوع
      </button>
      <h2 style={{ fontFamily: "Changa, sans-serif", color: "#fff", textAlign: "center", fontWeight: 800, fontSize: 24, marginBottom: 22 }}>
        معرض مواطني برق برق
      </h2>
      {items === null ? (
        <div style={{ textAlign: "center", color: "#ffd7f0" }}><Loader2 className="bb-spin" /></div>
      ) : items.length === 0 ? (
        <p style={{ textAlign: "center", color: "#ffd7f0", fontFamily: "Tajawal, sans-serif" }}>
          لا يوجد مواطنون في المعرض العام بعد. كن أول من ينضم!
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 18 }}>
          {items.map((it) => (
            <div key={it.id_number}>
              <CardCanvas profile={it} fontsReady={fontsReady} maxWidth={220} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================== app ============================== */

export default function App() {
  const [view, setView] = useState("loading");
  const [profile, setProfile] = useState(null);
  const [fontsReady, setFontsReady] = useState(false);

  // Load Google Fonts once, then let the canvas know it's safe to draw text.
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Changa:wght@400;700;800&family=Tajawal:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    let done = false;
    const finish = () => { if (!done) { done = true; setFontsReady(true); } };
    link.onload = () => {
      if (document.fonts?.ready) document.fonts.ready.then(finish).catch(finish);
      else finish();
    };
    link.onerror = finish;
    const t = setTimeout(finish, 1800);
    return () => clearTimeout(t);
  }, []);

  // Restore session on load, and keep it in sync if it changes elsewhere.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: prof } = await supabase.from("citizens").select("*").eq("id", session.user.id).single();
        if (!cancelled) {
          if (prof) { setProfile(prof); setView("card"); }
          else setView("landing");
        }
      } else if (!cancelled) {
        setView("landing");
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { setProfile(null); setView("landing"); }
    });
    return () => { cancelled = true; listener.subscription.unsubscribe(); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setView("landing");
  };

  return (
    <div dir="rtl" lang="ar" style={{
      minHeight: "100vh", position: "relative", overflow: "hidden",
      background: "radial-gradient(circle at 50% 0%, #4a0038 0%, #1a0316 55%, #0d0110 100%)",
      fontFamily: "Tajawal, sans-serif",
    }}>
      <style>{`
        @keyframes bb-twinkle { 0%,100% { opacity: 0.15; } 50% { opacity: 0.9; } }
        .bb-spin { animation: bb-spin-rotate 1s linear infinite; }
        @keyframes bb-spin-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::selection { background: #ff5fc4; color: #fff; }
      `}</style>
      <Starfield />
      <div style={{ position: "relative", zIndex: 1 }}>
        {view === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh", color: "#ffd7f0", gap: 12 }}>
            <Loader2 size={28} className="bb-spin" />
            <span style={{ fontFamily: "Tajawal, sans-serif" }}>جارِ فتح عالم برق برق...</span>
          </div>
        )}

        {view === "landing" && (
          <Landing
            onCreate={() => setView("register")}
            onLogin={() => setView("login")}
            onGallery={() => setView("gallery")}
          />
        )}

        {view === "register" && (
          <RegisterView
            onBack={() => setView("landing")}
            onDone={(inserted) => { setProfile(inserted); setView("card"); }}
          />
        )}

        {view === "login" && (
          <LoginView
            onBack={() => setView("landing")}
            onDone={(prof) => { setProfile(prof); setView("card"); }}
          />
        )}

        {view === "card" && profile && (
          <>
            <div style={{ textAlign: "center", paddingTop: 10 }}>
              <button onClick={() => setView("landing")} style={{
                background: "none", border: "none", color: "rgba(255,215,240,0.6)", fontFamily: "Tajawal, sans-serif",
                fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
              }}>
                <Home size={13} /> الرئيسية
              </button>
            </div>
            <CardView
              profile={profile}
              fontsReady={fontsReady}
              onEdit={() => setView("edit")}
              onLogout={handleLogout}
              onGallery={() => setView("gallery")}
            />
          </>
        )}

        {view === "edit" && profile && (
          <EditView
            profile={profile}
            onBack={() => setView("card")}
            onSave={(updated) => { setProfile(updated); setView("card"); }}
          />
        )}

        {view === "gallery" && (
          <GalleryView fontsReady={fontsReady} onBack={() => setView(profile ? "card" : "landing")} />
        )}
      </div>
    </div>
  );
      }
