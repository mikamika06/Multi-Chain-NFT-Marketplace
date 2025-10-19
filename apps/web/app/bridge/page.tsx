import { client, BRIDGE_EVENTS_QUERY } from '../../lib/api';
import { BridgeRequestForm } from '../../components/bridge-request-form';

type BridgeEvent = {
  id: string;
  tokenPk: string;
  srcChain: string;
  dstChain: string;
  protocol: string;
  status: string;
  fee: number;
  messageId: string;
  createdAt: string;
  token?: {
    id: string;
    tokenId: string;
    owner: string;
    collection?: {
      id: string;
      name: string;
      chainId: string;
    } | null;
  } | null;
};

type BridgeEventsResponse = {
  bridgeEvents: BridgeEvent[];
};

export const revalidate = 15;

async function getBridgeEvents(): Promise<BridgeEvent[]> {
  try {
    const { bridgeEvents } = await client.request<BridgeEventsResponse>(BRIDGE_EVENTS_QUERY);
    return bridgeEvents;
  } catch (error) {
    console.warn('Failed to fetch bridge events, falling back to empty list', error);
    return [];
  }
}

export default async function BridgePage() {
  const events = await getBridgeEvents();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">Cross-Chain Bridge</h1>
        <p className="text-sm text-slate-300">
          Transfer NFTs between networks
        </p>
      </header>

      <BridgeRequestForm />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Recent Transfers</h2>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm text-slate-200">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Protocol</th>
                <th className="px-4 py-3">Fee</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-white">
                        {event.token?.collection?.name ?? 'Unknown'} · #{event.token?.tokenId ?? '—'}
                      </span>
                      <span className="text-xs text-slate-400">Owner {event.token?.owner ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {event.srcChain} → {event.dstChain}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">{event.protocol}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">{event.fee.toFixed(4)} ETH</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white">
                      {event.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(event.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {!events.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-300">
                    No bridge events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
