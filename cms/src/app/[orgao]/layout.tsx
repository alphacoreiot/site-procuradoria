export default function LayoutOrgao({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/assets/vendor/leaflet/leaflet.css" precedence="default" />
      <link rel="stylesheet" href="/assets/css/design-system.css" precedence="default" />
      <link rel="stylesheet" href="/assets/css/portal.css" precedence="default" />
      <link rel="stylesheet" href="/assets/css/cms.css" precedence="default" />
      {children}
    </>
  );
}
