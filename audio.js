// Voice notes: record -> dataURL -> insert <audio> block
export async function recordAudioFlow(insertAudioCb, statusCb){
  if (!navigator.mediaDevices?.getUserMedia) {
    alert('Audio recording not supported in this browser.');
    return;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  rec.onstop = async () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const dataUrl = await blobToDataURL(blob);
    insertAudioCb(dataUrl);
    stream.getTracks().forEach(t=>t.stop());
    statusCb?.('Saved ✓');
  };
  rec.start();
  statusCb?.('Recording… (click again to stop)');
  return () => { // returns a stopper
    if (rec.state !== 'inactive') rec.stop();
  };
}

export function blobToDataURL(blob){
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}