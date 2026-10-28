/** Action Auth0: cấu hình Secrets, Deploy rồi gắn vào Post Login. */
exports.onExecutePostLogin = async (event, api) => {
  const client = event.secrets.SPA_CLIENT_ID;
  const audience = event.secrets.API_AUDIENCE;
  const connection = event.secrets.VNEID_CONNECTION;
  if (!client || !audience || !connection || event.client.client_id !== client) return;
  if (event.connection.name !== connection) return;
  const citizen = event.user.app_metadata?.vneid?.citizen;
  if (!citizen) return;
  const namespace = 'https://vneid.gov.vn/';
  const claims = {
    cccd_number: citizen.cccd_number,
    full_name: citizen.full_name,
    dob: citizen.dob,
    gender: citizen.gender,
    address: citizen.address,
    email: event.user.email,
    source: 'AUTH0_VNEID_SIMULATION',
    connection: event.connection.name,
  };
  for (const [name, value] of Object.entries(claims)) {
    if (typeof value !== 'string' || !value.trim()) continue;
    api.idToken.setCustomClaim(namespace + name, value);
    if (event.resource_server?.identifier === audience) api.accessToken.setCustomClaim(namespace + name, value);
  }
};
