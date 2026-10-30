import * as acp from "@agentclientprotocol/sdk/unstable";

// SDK 2 removed `AgentSideConnection` and the `Agent` interface. The fixtures
// keep their agent classes; this serves one over the app API. The class gets
// the SDK 1 outbound surface it uses (`sessionUpdate`, `requestPermission`),
// each implemented method becomes a handler, and `extMethod` (set per instance)
// still receives only `_`-prefixed extension requests.
const REQUESTS = {
  initialize: acp.methods.agent.initialize,
  authenticate: acp.methods.agent.authenticate,
  newSession: acp.methods.agent.session.new,
  loadSession: acp.methods.agent.session.load,
  listSessions: acp.methods.agent.session.list,
  resumeSession: acp.methods.agent.session.resume,
  closeSession: acp.methods.agent.session.close,
  setSessionMode: acp.methods.agent.session.setMode,
  setSessionConfigOption: acp.methods.agent.session.setConfigOption,
  prompt: acp.methods.agent.session.prompt,
};

export function serveAgent(createAgent, stream) {
  let client;
  const agent = createAgent({
    sessionUpdate: (params) =>
      client.notify(acp.methods.client.session.update, params),
    requestPermission: (params) =>
      client.request(acp.methods.client.session.requestPermission, params),
  });
  const app = acp.agent();

  for (const [name, method] of Object.entries(REQUESTS)) {
    if (typeof agent[name] === "function")
      app.onRequest(method, ({ params }) => agent[name](params));
  }
  if (typeof agent.cancel === "function")
    app.onNotification(acp.methods.agent.session.cancel, ({ params }) =>
      agent.cancel(params),
    );
  app.onRequest("*", ({ method, params }) => {
    if (!method.startsWith("_") || typeof agent.extMethod !== "function")
      throw acp.RequestError.methodNotFound(method);

    return agent.extMethod(method, params);
  });

  client = app.connect(stream).client;

  return agent;
}
