import QRCode from "qrcode";

/**
 * Renders the QR matrix as inline SVG. Building the path ourselves avoids
 * canvas and zlib, neither of which exist on the Workers runtime.
 */
export default function QrCode({
  value,
  size = 120,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const count = qr.modules.size;
  const data = qr.modules.data;

  let path = "";
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (data[row * count + column]) {
        path += `M${column} ${row}h1v1h-1z`;
      }
    }
  }

  const quiet = 2;
  const extent = count + quiet * 2;

  return (
    <svg
      role="img"
      aria-label={`QR code for ${value}`}
      width={size}
      height={size}
      viewBox={`0 0 ${extent} ${extent}`}
      className={className}
      shapeRendering="crispEdges"
    >
      <rect width={extent} height={extent} fill="#ffffff" />
      <g transform={`translate(${quiet} ${quiet})`} fill="#000000">
        <path d={path} />
      </g>
    </svg>
  );
}
