export default function DisplayLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`* { margin: 0; padding: 0; box-sizing: border-box; } body { background: #000; overflow: hidden; }`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
