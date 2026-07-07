(function initSpinningLogos() {
  const ROTATION_SPEED = 0.05;
  const COUNTER_ROTATION_MULTIPLIER = -1.8;
  const SMOOTHING = 0.1;

  const spinningLogos = Array.from(
    document.querySelectorAll("figure.spinning-logo")
  ).map((figure) => {
    const [outer, inner] = figure.querySelectorAll("svg");
    return { outer, inner };
  });

  spinningLogos.forEach(({ outer, inner }) => {
    if (outer) outer.style.willChange = "transform";
    if (inner) inner.style.willChange = "transform";
  });

  let currentScroll = window.scrollY;
  let targetScroll = currentScroll;

  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  function animate() {
    currentScroll = lerp(currentScroll, targetScroll, SMOOTHING);

    spinningLogos.forEach(({ outer, inner }) => {
      const rotation = currentScroll * ROTATION_SPEED;
      if (outer) outer.style.transform = `rotate(${rotation}deg)`;
      if (inner)
        inner.style.transform = `rotate(${rotation * COUNTER_ROTATION_MULTIPLIER}deg)`;
    });

    requestAnimationFrame(animate);
  }

  window.addEventListener(
    "scroll",
    () => {
      targetScroll = window.scrollY;
    },
    { passive: true }
  );

  animate();
})();

(function initBeforeAfterSliders() {
  document.querySelectorAll("[data-before-after]").forEach((wrapper) => {
    const frame = wrapper.querySelector(".before-after__frame");
    const range = wrapper.querySelector(".before-after__slider");
    if (!frame || !range) return;

    const updateReveal = () =>
      frame.style.setProperty("--reveal", `${range.value}%`);
    range.addEventListener("input", updateReveal);
    updateReveal();
  });
})();
