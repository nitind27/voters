import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import fs from 'fs';
import path from 'path';

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
                colony_id: readNum('colony_id'),
                house_number: read('house_number'),
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
            colony_id,
            house_number = '',
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

        // Start transaction to ensure atomicity
        await connection.beginTransaction();

        // Check if colony_entry exists, else insert it
        const [existingColonyEntries] = await connection.query<RowDataPacket[]>(
            `SELECT colony_entry_id FROM colony_entry WHERE colony_id = ? AND house_number = ?`,
            [colony_id, house_number]
        );

        let colony_entry_id: number;

        if (existingColonyEntries.length > 0) {
            colony_entry_id = existingColonyEntries[0].colony_entry_id;
        } else {
            const [insertColonyRes] = await connection.execute<ResultSetHeader>(
                `INSERT INTO colony_entry (colony_id, house_number) VALUES (?, ?)`,
                [colony_id, house_number]
            );
            colony_entry_id = insertColonyRes.insertId;
        }

        // Insert new voter_entry using the colony_entry_id
        const insertQuery = `
            INSERT INTO voter_entry (
                colony_entry_id, first_name, middle_name, last_name, full_name,
                first_name_mr, middle_name_mr, last_name_mr, full_name_mr,
                voter_number, gender, relation, dob, aadhaar_number,
                booth_number, mobile, user_id, type_status, availability, photo
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

        // Commit transaction after both inserts
        await connection.commit();

        // Retrieve and return inserted voter with colony and colony_entry data
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
        if (connection) await connection.rollback();
        console.error('Insert failed:', error);
        return NextResponse.json({ error: 'Failed to insert data' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
