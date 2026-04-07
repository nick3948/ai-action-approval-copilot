import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getDbPool, setupHistoryTable } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await setupHistoryTable();

    const db = getDbPool();
    const result = await db.query(
      `SELECT id, title, CAST(date AS text) as date FROM user_chat_history WHERE user_id = $1 ORDER BY date DESC LIMIT 100`,
      [session.user.sub]
    );

    const history = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      date: parseInt(row.date, 10)
    }));

    return NextResponse.json(history);
  } catch (err: any) {
    console.error("[GET /api/history] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, title } = await req.json();
    if (!id || !title) return NextResponse.json({ error: "id and title required" }, { status: 400 });

    await setupHistoryTable();

    const db = getDbPool();
    await db.query(
      `INSERT INTO user_chat_history (id, user_id, title, date) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title`,
      [id, session.user.sub, title, Date.now()]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/history] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth0.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await setupHistoryTable();

    const db = getDbPool();
    await db.query(`DELETE FROM user_chat_history WHERE id = $1 AND user_id = $2`, [id, session.user.sub]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/history] Error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
