import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CarFront, Check, Clock3, MapPin, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ParkingSlotGrid from '../components/ParkingSlotGrid';
import StatusBadge from '../components/StatusBadge';

const DEMO_SLOTS = [
  { slotId: 'a01', slotNumber: 'A01', slotType: 'CAR', status: 'AVAILABLE' },
  { slotId: 'a02', slotNumber: 'A02', slotType: 'CAR', status: 'OCCUPIED' },
  { slotId: 'a03', slotNumber: 'A03', slotType: 'CAR', status: 'AVAILABLE' },
  { slotId: 'a04', slotNumber: 'A04', slotType: 'CAR', status: 'AVAILABLE' },
  { slotId: 'a05', slotNumber: 'A05', slotType: 'CAR', status: 'RESERVED' },
  { slotId: 'a06', slotNumber: 'A06', slotType: 'CAR', status: 'AVAILABLE' },
  { slotId: 'a07', slotNumber: 'A07', slotType: 'CAR', status: 'AVAILABLE' },
  { slotId: 'a08', slotNumber: 'A08', slotType: 'CAR', status: 'OCCUPIED' },
  { slotId: 'm01', slotNumber: 'M01', slotType: 'MOTORCYCLE', status: 'AVAILABLE' },
  { slotId: 'm02', slotNumber: 'M02', slotType: 'MOTORCYCLE', status: 'AVAILABLE' },
  { slotId: 'm03', slotNumber: 'M03', slotType: 'MOTORCYCLE', status: 'MAINTENANCE' },
  { slotId: 'm04', slotNumber: 'M04', slotType: 'MOTORCYCLE', status: 'AVAILABLE' },
];

const QUICK_STATS = [
  { value: '64', label: 'spaces monitored' },
  { value: '4.9', label: 'average arrival' },
  { value: '24/7', label: 'parking visibility' },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const selectedSlot = DEMO_SLOTS.find((slot) => slot.slotId === selectedSlotId);

  return (
    <main className="home-page">
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy reveal-up">
            <div className="eyebrow"><Sparkles size={15} /> Parking, without the circling</div>
            <h1>Your spot is waiting.</h1>
            <div className="hero-actions">
              <Link to={isAuthenticated ? '/' : '/register'} className="btn btn-primary">{isAuthenticated ? 'Explore your space' : 'Get started'} <ArrowRight size={17} /></Link>
              {!isAuthenticated && <Link to="/login" className="text-link">I already have an account</Link>}
            </div>
            <div className="hero-trust"><span><Check size={15} /> No queue anxiety</span><span><Check size={15} /> Simple reservations</span></div>
          </div>

          <div className="availability-card reveal-card" aria-label="Live parking availability preview">
            <div className="card-topline"><span className="live-dot" /> Live availability <span className="card-time">Updated now</span></div>
            <div className="availability-title"><div><span className="micro-label">Downtown district</span><h2>Central Arcade</h2></div><MapPin size={20} /></div>
            <div className="availability-number"><strong>48</strong><span>open bays<br />right now</span></div>
            <div className="bay-grid" aria-hidden="true">
              {Array.from({ length: 24 }, (_, index) => <span key={index} className={index === 4 || index === 8 || index === 15 || index === 21 ? 'bay-cell occupied' : 'bay-cell'} />)}
            </div>
            <div className="availability-footer"><span><CarFront size={16} /> 64 total spaces</span><span className="status-pill">Good availability</span></div>
          </div>
        </div>
      </section>

      <section className="container command-section">
        <div className="section-heading-row reveal-up"><div><span className="eyebrow"><Zap size={15} /> Your parking view</span><h2>Pick your bay before you arrive.</h2></div><div className="command-location"><MapPin size={16} /> Central Arcade <span className="live-dot" /></div></div>
        <div className="command-grid">
          <div className="command-plan reveal-up"><ParkingSlotGrid slots={DEMO_SLOTS} selectedSlotId={selectedSlotId} isSelectable={(slot) => ({ ok: slot.status === 'AVAILABLE', reason: 'This bay is not available' })} onSelect={(slot) => setSelectedSlotId(slot.slotId)} /></div>
          <aside className="selection-panel reveal-card">
            <div className="selection-status"><span className="live-dot" /> Selection preview</div>
            <div className="selection-number">{selectedSlot ? selectedSlot.slotNumber : 'A--'}</div>
            <p className="selection-label">{selectedSlot ? 'Available for your arrival' : 'Tap an open bay to select it'}</p>
            {selectedSlot ? <StatusBadge status={selectedSlot.status} /> : <StatusBadge status="AVAILABLE" />}
            <div className="selection-facts"><span><Clock3 size={16} /> Flexible time window</span><span><ShieldCheck size={16} /> Secure reservation</span></div>
            <Link to={isAuthenticated ? '/' : '/register'} className="btn btn-primary btn-block">Reserve this space <ArrowRight size={16} /></Link>
          </aside>
        </div>
        <div className="stats-strip reveal-up">{QUICK_STATS.map((stat) => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</div>
      </section>

      <section className="container proof-section">
        <div className="proof-heading reveal-up"><span className="eyebrow">Less searching. More arriving.</span><h2>Parking tools that make sense at a glance.</h2></div>
        <div className="feature-grid">
          <article className="feature-card reveal-up"><div className="feature-icon"><MapPin size={20} /></div><div><h3>Live locations</h3><span>Know what is open nearby</span></div></article>
          <article className="feature-card reveal-up"><div className="feature-icon"><Clock3 size={20} /></div><div><h3>Time windows</h3><span>Plan the exact time you need</span></div></article>
          <article className="feature-card reveal-up"><div className="feature-icon"><ShieldCheck size={20} /></div><div><h3>Protected booking</h3><span>Keep every reservation in one place</span></div></article>
        </div>
      </section>

      <section className="container bottom-cta reveal-up"><div><span className="eyebrow">Ready when you are</span><h2>Make parking the easy part of your day.</h2></div><Link to={isAuthenticated ? '/' : '/register'} className="btn btn-light">{isAuthenticated ? 'Back to home' : 'Create free account'} <ArrowRight size={17} /></Link></section>
    </main>
  );
}
