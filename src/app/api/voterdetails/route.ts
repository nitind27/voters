import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import fs from 'fs';
import path from 'path';
// -------------------- GET Method --------------------
export async function GET(request: NextRequest) {
	let connection;
	try {
		const { searchParams } = new URL(request.url);
		const voterId = searchParams.get('voter_id');

		connection = await pool.getConnection();

		let query = `
			SELECT 
				ve.*,
				ce.house_number,
				c.colony_name
			FROM voter_entry ve
			LEFT JOIN colony_entry ce ON ve.colony_entry_id = ce.colony_entry_id
			LEFT JOIN colony c ON ce.colony_id = c.colony_id
			WHERE ve.status = "Active"
		`;
		const params: (string | number)[] = [];

		if (voterId) {
			query += ' AND ve.voter_id = ?';
			params.push(voterId);
		}

		query += ' ORDER BY ve.voter_id DESC';

		const [rows] = await connection.query<RowDataPacket[]>(query, params);
		return NextResponse.json(rows);
	} catch (error) {
		console.error('Database query failed (GET):', error);
		return NextResponse.json({ message: 'Failed to fetch voter details' }, { status: 500 });
	} finally {
		if (connection) connection.release();
	}
}

// -------------------- POST Method (Insert) --------------------
// In POST: add availability in payload, insert, and returned row
// -------------------- POST Method (Insert) --------------------


export async function POST(request: NextRequest) {
	let connection;
	try {
		const contentType = request.headers.get('content-type') || '';
		let payload: Record<string, unknown> = {};
		let maybePhoto: File | null = null;

		if (contentType.includes('multipart/form-data')) {
			const form = await request.formData();

			const read = (k: string) => {
				const v = form.get(k);
				return v === null || v === undefined ? '' : v.toString();
			};

			const readNum = (k: string) => {
				const v = read(k);
				return v ? Number(v) : null;
			};

			payload = {
				colony_entry_id: readNum('colony_entry_id'),
				first_name: read('first_name'),
				middle_name: read('middle_name'),
				last_name: read('last_name'),
				first_name_mr: read('first_name_mr'),
				middle_name_mr: read('middle_name_mr'),
				last_name_mr: read('last_name_mr'),
				voter_number: read('voter_number'),
				gender: read('gender'),
				relation: read('relation'),
				dob: read('dob'),
				aadhaar_number: read('aadhaar_number'),
				booth_number: read('booth_number'),
				mobile: read('mobile'),
				user_id: read('user_id'),
				type_status: read('type_status'),
				availability: read('availability'),
			};

			const p = form.get('photo');
			if (p && p instanceof File) {
				maybePhoto = p;
			}
		} else {
			payload = await request.json();
		}

		const {
			colony_entry_id,
			first_name, middle_name, last_name,
			first_name_mr, middle_name_mr, last_name_mr,
			voter_number = '',
			gender = '',
			relation = '',
			dob = '',
			aadhaar_number = '',
			booth_number = '',
			mobile = '',
			user_id,
			type_status,
			availability = '',
		} = payload;


		// Save photo to disk (filename stored for DB)
		let photoFilename = '';
		if (maybePhoto) {
			try {
				const tmpBasePath = path.join(process.cwd(), 'tmp', 'uploads');
				const profileDir = path.join(tmpBasePath, 'uploadsprofile');
				if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

				const buffer = Buffer.from(await maybePhoto.arrayBuffer());
				const safeName = `${Date.now()}_${maybePhoto.name.replace(/\s+/g, '_')}`;
				const filePath = path.join(profileDir, safeName);
				await fs.promises.writeFile(filePath, buffer);
				photoFilename = safeName;
			} catch (e) {
				console.warn('Photo save failed, continuing without photo:', e);
			}
		}

		const full_name = [first_name, middle_name, last_name].filter(Boolean).join(' ').trim();
		const full_name_mr = [first_name_mr, middle_name_mr, last_name_mr].filter(Boolean).join(' ').trim();

		connection = await pool.getConnection();

		const insertQuery = `
		INSERT INTO voter_entry (
		  colony_entry_id,
		  first_name,
		  middle_name,
		  last_name,
		  full_name,
		  first_name_mr,
		  middle_name_mr,
		  last_name_mr,
		  full_name_mr,
		  voter_number,
		  gender,
		  relation,
		  dob,
		  aadhaar_number,
		  booth_number,
		  mobile,
		  user_id,
		  type_status,
		  availability,
		  photo
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	  `;

		const [result] = await connection.execute<ResultSetHeader>(insertQuery, [
			colony_entry_id,
			first_name, middle_name, last_name,
			full_name, first_name_mr, middle_name_mr, last_name_mr, full_name_mr,
			voter_number, gender, relation, dob,
			aadhaar_number, booth_number, mobile,
			user_id, type_status, availability,
			photoFilename
		]);

		const insertedId = result.insertId;

		const [rows] = await connection.query<RowDataPacket[]>(
			`SELECT ve.*, ce.house_number, c.colony_name
             FROM voter_entry ve
             LEFT JOIN colony_entry ce ON ve.colony_entry_id = ce.colony_entry_id
             LEFT JOIN colony c ON ce.colony_id = c.colony_id
             WHERE ve.voter_id = ?`,
			[insertedId]
		);

		return NextResponse.json({ success: true, data: rows[0] || null });
	} catch (error) {
		console.error('Database insert failed (POST):', error);
		return NextResponse.json({ error: 'Failed to insert voter' }, { status: 500 });
	} finally {
		if (connection) connection.release();
	}
}

// -------------------- PUT Method (Update) --------------------
export async function PUT(request: NextRequest) {
	let connection;
	try {
		const body = await request.json();
		const {
			voter_id,
			first_name, middle_name, last_name,
			first_name_mr,
			middle_name_mr = '',
			last_name_mr,
			voter_number = '',
			gender = '',
			relation = '',
			dob = '',
			aadhaar_number = '',
			booth_number = '',
			mobile = '',
			availability = '',
			colony_id,             // NEW (optional)
			colony_entry_id,       // optional direct override
			house_number,          // NEW (optional; used both to update and to map colony entry)
		} = body;



		const full_name = [first_name, middle_name, last_name].filter(Boolean).join(' ').trim();
		const full_name_mr = [first_name_mr, middle_name_mr, last_name_mr].filter(Boolean).join(' ').trim();

		connection = await pool.getConnection();

		// Fetch current row (with current house number from colony_entry)
		const [currRows] = await connection.query<RowDataPacket[]>(
			`SELECT ve.voter_id, ve.colony_entry_id, ce.house_number AS current_house_number
			 FROM voter_entry ve
			 LEFT JOIN colony_entry ce ON ve.colony_entry_id = ce.colony_entry_id
			 WHERE ve.voter_id = ?`,
			[voter_id]
		);
		type CurrentRow = { voter_id: number; colony_entry_id: number; current_house_number: string | null };
		const current: CurrentRow | undefined = (currRows as RowDataPacket[])[0] as unknown as CurrentRow;
		let newColonyEntryId: number | null = null;

		if (colony_entry_id) {
			newColonyEntryId = Number(colony_entry_id);
		} else if (colony_id) {
			const useHouse = house_number ?? current?.current_house_number ?? '';
			if (useHouse) {
				const [mapRows] = await connection.query<RowDataPacket[]>(
					`SELECT colony_entry_id FROM colony_entry WHERE colony_id = ? AND house_number = ? LIMIT 1`,
					[colony_id, useHouse]
				);
				const found = mapRows[0] as { colony_entry_id?: number } | undefined;
				if (found?.colony_entry_id) {
					newColonyEntryId = Number(found.colony_entry_id);
				}
			}
		}

		const updateQuery = `
		UPDATE voter_entry
		SET
			first_name = ?,
			middle_name = ?,
			last_name = ?,
			full_name = ?,
			first_name_mr = ?,
			middle_name_mr = ?,
			last_name_mr = ?,
			full_name_mr = ?,
			voter_number = ?,
			gender = ?,
			relation = ?,
			dob = ?,
			aadhaar_number = ?,
			booth_number = ?,
			mobile = ?,
			availability = ?,
			colony_entry_id = COALESCE(?, colony_entry_id),
			edited = 1,
			updated_at = NOW()
		WHERE voter_id = ? AND status = "Active"
		`;

		const [result] = await connection.execute<ResultSetHeader>(updateQuery, [
			first_name || '', middle_name || '', last_name || '', full_name, first_name_mr, middle_name_mr, last_name_mr, full_name_mr,
			voter_number, gender, relation, dob, aadhaar_number, booth_number, mobile, availability,
			newColonyEntryId ?? null,
			voter_id
		]);

		if (result.affectedRows === 0) {
			return NextResponse.json({ error: 'Voter not found or no changes made' }, { status: 404 });
		}

		const [rows] = await connection.query<RowDataPacket[]>(
			`SELECT ve.*, ce.house_number, c.colony_name, c.colony_id
			 FROM voter_entry ve
			 LEFT JOIN colony_entry ce ON ve.colony_entry_id = ce.colony_entry_id
			 LEFT JOIN colony c ON ce.colony_id = c.colony_id
			 WHERE ve.voter_id = ?`,
			[voter_id]
		);

		return NextResponse.json({ success: true, data: rows[0] || null });
	} catch (error) {
		console.error('Database update failed (PUT):', error);
		return NextResponse.json({ error: 'Failed to update voter' }, { status: 500 });
	} finally {
		if (connection) connection.release();
	}
}

// -------------------- DELETE Method (Soft delete -> Inactive) --------------------
export async function DELETE(request: NextRequest) {
	let connection;
	try {
		const body = await request.json();
		const { voter_id } = body;

		if (!voter_id) {
			return NextResponse.json({ error: 'voter_id is required' }, { status: 400 });
		}

		connection = await pool.getConnection();
		const deleteQuery = `
			UPDATE voter_entry 
			SET status = 'Inactive', updated_at = NOW()
			WHERE voter_id = ? AND status = "Active"
		`;

		const [result] = await connection.execute<ResultSetHeader>(deleteQuery, [voter_id]);

		if (result.affectedRows === 0) {
			return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Database delete failed (DELETE):', error);
		return NextResponse.json({ error: 'Failed to delete voter' }, { status: 500 });
	} finally {
		if (connection) connection.release();
	}
}