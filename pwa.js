// pwa.js
let deferredPrompt;
const installBtn = document.createElement("button");
installBtn.textContent = "⬇ Install App";
installBtn.className = "pwa-install-btn hidden";
document.addEventListener('DOMContentLoaded', () => {
  document.body.appendChild(installBtn);
});

function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
}

// Hide button if already installed / running standalone
function updateInstallVisibility(){
  if (isStandalone()) {
    installBtn.classList.add('hidden');
  }
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!isStandalone()) {
    installBtn.classList.remove("hidden");
  }
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  if (outcome === "accepted") installBtn.classList.add("hidden");
});

window.addEventListener('appinstalled', () => {
  installBtn.classList.add('hidden');
});

updateInstallVisibility();

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js").catch(console.error);
}
