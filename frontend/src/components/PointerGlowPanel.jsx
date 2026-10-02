export default function PointerGlowPanel({ children }) {
  function updatePointer(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--pointer-x', `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty('--pointer-y', `${event.clientY - bounds.top}px`);
  }

  function resetPointer(event) {
    event.currentTarget.style.setProperty('--pointer-x', '50%');
    event.currentTarget.style.setProperty('--pointer-y', '50%');
  }

  return (
    <div className="auth-panel" onPointerEnter={updatePointer} onPointerMove={updatePointer} onPointerLeave={resetPointer}>
      {children}
    </div>
  );
}