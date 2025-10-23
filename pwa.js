// pwa.js
let deferredPrompt;
const installBtn = document.createElement("button");
installBtn.textContent = "⬇ Install App";
installBtn.className = "pwa-install-btn hidden";
document.body.appendChild(installBtn);

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.classList.remove("hidden");
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") installBtn.classList.add("hidden");
  deferredPrompt = null;
});

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(console.error);
}