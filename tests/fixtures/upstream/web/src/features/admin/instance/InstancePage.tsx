function VersionCard() {
  const q = $api.useQuery('get', '/api/v1/admin/updates')
  return (
    <section className="card" aria-labelledby="ver-h">
      <CardSection title={<span id="ver-h">Version &amp; updates</span>} caption="Current version, latest release and how to upgrade" />
      {q.isError ? (
