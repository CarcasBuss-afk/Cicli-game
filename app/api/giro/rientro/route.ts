import { handler } from '@/lib/giro/http';
import { rientro } from '@/lib/giro/service';

export const dynamic = 'force-dynamic';
export const POST = handler(rientro);
