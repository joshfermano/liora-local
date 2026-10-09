import { en } from '../content/copy';
import { Lattice } from './Lattice';
import { LinkRow } from './decisionParts';

export function DecidedLink({ id }: { id: string }) {
  return (
    <Lattice>
      <LinkRow label={en('decided.link')} href={`/decided/${id}`} />
    </Lattice>
  );
}
