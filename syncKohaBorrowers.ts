import 'dotenv/config';
import mysql from 'mysql2/promise';
import mongoose, { Schema, Document, Model } from 'mongoose';

// Koha borrower shape from MySQL
interface KohaBorrower {
  cardnumber: string | null;
  surname: string | null;
  firstname: string | null;
  categorycode: string | null;
  branchcode: string | null;
  email: string | null;
  dateofbirth: Date | string | null;
  sex: string | null;
}

// Mongo InOut doc (no user lookup from Mongo)
interface InOutDoc extends Document {
  entryType: 'entry' | 'exit';
  timestamp: Date;
  method: 'manual_entry' | 'auto_scan' | 'id_card' | 'qr_code';
  registrationNumber: string;
  location?: string;
  purpose?: string;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Attached metadata from Koha at write time
  borrowerName?: string;
  borrowerEmail?: string;
  borrowerCategory?: string;
  borrowerBranch?: string;
}

const InOutSchema = new Schema<InOutDoc>({
  entryType: { type: String, required: true, enum: ['entry', 'exit'] },
  timestamp: { type: Date, required: true, default: () => new Date() },
  method: { type: String, required: true, enum: ['manual_entry', 'auto_scan', 'id_card', 'qr_code'] },
  registrationNumber: { type: String, required: true, index: true },
  location: { type: String },
  purpose: { type: String },
  status: { type: String },
  borrowerName: { type: String },
  borrowerEmail: { type: String },
  borrowerCategory: { type: String },
  borrowerBranch: { type: String }
}, { collection: 'inouts', timestamps: true, strict: false });

let InOutModel: Model<InOutDoc>;
try {
  InOutModel = mongoose.model<InOutDoc>('InOut');
} catch {
  InOutModel = mongoose.model<InOutDoc>('InOut', InOutSchema);
}

function getMysqlConfig() {
  return {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'koha_library',
    timezone: 'Z' as const
  };
}

function getMongoUri() {
  return process.env.MONGODB_URI || 'mongodb://localhost:27017/library_automation';
}

export interface RecordEventInput {
  cardnumber: string; // Koha borrower.cardnumber
  entryType: 'entry' | 'exit';
  method: 'manual_entry' | 'auto_scan' | 'id_card' | 'qr_code';
  location?: string;
  purpose?: string;
  status?: string;
  timestamp?: Date;
}

/**
 * Looks up borrower in Koha by cardnumber and writes an InOut document to Mongo.
 * Never queries Mongo for user information.
 */
export async function recordInOutEvent(input: RecordEventInput): Promise<InOutDoc | null> {
  let mysqlConn: mysql.Connection | null = null;
  let mongoConnected = false;
  try {
    mysqlConn = await mysql.createConnection(getMysqlConfig());
    await mongoose.connect(getMongoUri());
    mongoConnected = true;

    const card = input.cardnumber.trim();
    console.log(`[InOut] Processing ${input.entryType} for cardnumber=${card}`);

    // Fetch borrower only from MySQL (Koha)
    const [rows] = await mysqlConn.execute<mysql.RowDataPacket[]>(
      `SELECT cardnumber, surname, firstname, categorycode, branchcode, email
       FROM borrowers WHERE cardnumber = ? LIMIT 1`,
      [card]
    );

    if (!rows.length) {
      console.warn(`[InOut] Koha borrower not found for cardnumber=${card}`);
      return null;
    }

    const b: KohaBorrower = rows[0] as any;
    const borrowerName = `${b.firstname ?? ''} ${b.surname ?? ''}`.trim();
    const borrowerEmail = b.email ?? '';
    const borrowerCategory = b.categorycode ?? '';
    const borrowerBranch = b.branchcode ?? '';

    const doc = await InOutModel.create({
      entryType: input.entryType,
      timestamp: input.timestamp ?? new Date(),
      method: input.method,
      registrationNumber: card,
      location: input.location ?? 'main_gate',
      purpose: input.purpose ?? 'study',
      status: input.status ?? 'completed',
      borrowerName,
      borrowerEmail,
      borrowerCategory,
      borrowerBranch
    });

    console.log(`[InOut] Saved ${doc.entryType} for ${card} (${borrowerName})`);
    return doc;
  } catch (err: any) {
    console.error('[InOut] Error:', err?.message || err);
    return null;
  } finally {
    if (mysqlConn) { try { await mysqlConn.end(); } catch {} }
    if (mongoConnected) { try { await mongoose.connection.close(); } catch {} }
  }
}

/**
 * Backward-compatible exported function name for cron/jobs.
 * Here it just prints usage; real work is done by recordInOutEvent().
 */
export async function syncKohaToMongo(): Promise<void> {
  console.log('[SYNC] This script no longer performs bulk syncs.');
  console.log('[SYNC] Use recordInOutEvent({ cardnumber, entryType, method, ... }) to write logs.');
}

// CLI usage: npm run sync:koha -- --card=9922008101 --type=entry --method=manual_entry --location=main_gate --purpose=study --status=completed
function parseArg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find(a => a.startsWith(prefix));
  return arg ? a.substring(prefix.length) : fallback;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const card = parseArg('card') || process.env.CARDNUMBER;
  const type = (parseArg('type') as 'entry' | 'exit') || 'entry';
  const method = (parseArg('method') as RecordEventInput['method']) || 'manual_entry';
  const location = parseArg('location') || 'main_gate';
  const purpose = parseArg('purpose') || 'study';
  const status = parseArg('status') || 'completed';

  if (!card) {
    console.log('Usage: npm run sync:koha -- --card=9922008101 --type=entry|exit --method=manual_entry|auto_scan|id_card|qr_code [--location=main_gate] [--purpose=study] [--status=completed]');
    process.exit(0);
  }

  recordInOutEvent({ cardnumber: card, entryType: type, method, location, purpose, status })
    .then(res => process.exit(res ? 0 : 1))
    .catch(() => process.exit(1));
}


