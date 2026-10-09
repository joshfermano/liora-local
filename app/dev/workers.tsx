import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { createWorkerClient, workerUrl } from '../../src/ai/worker-client';

export default function WorkersCheck() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const clients = (['ai', 'ml'] as const).map((name) => ({
      name,
      client: createWorkerClient(new Worker(workerUrl(name), { type: 'module' })),
    }));
    for (const { name, client } of clients) {
      client
        .request({ type: 'ping' })
        .then((reply) => setLines((all) => [...all, `${name}: ${JSON.stringify(reply)}`]))
        .catch((error: Error) => setLines((all) => [...all, `${name}: ${error.message}`]));
    }
    return () => clients.forEach(({ client }) => client.terminate());
  }, []);

  return (
    <View className="flex-1 p-4">
      <Text>Worker check</Text>
      {lines.map((line) => (
        <Text key={line}>{line}</Text>
      ))}
    </View>
  );
}
