// download.ts - Save-as en el navegador (blob + <a download>) para archivos
// que llegan por API (axios responseType 'blob') o se arman en el cliente.
// Único punto para este patrón: lo usan networkApi, customersService y
// csv-export; no lo dupliques en servicios nuevos.

/**
 * Dispara la descarga de `data` como archivo `filename`. `type` es el MIME del
 * Blob resultante (por defecto CSV UTF-8, el caso más común en el admin).
 */
export function saveBlob(
  data: BlobPart,
  filename: string,
  type = 'text/csv;charset=utf-8;',
): void {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
