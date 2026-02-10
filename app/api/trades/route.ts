import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// 创建数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = 'SELECT * FROM trades';
    const params: any[] = [];

    if (startDate && endDate) {
      query += ' WHERE is_closed = true AND date >= $1 AND date <= $2 ORDER BY created_at DESC';
      params.push(startDate, endDate);
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const result = await pool.query(query, params);

    const trades = result.rows.map((row: any) => ({
      id: row.id,
      symbol: row.symbol,
      strategy: row.strategy,
      position: Number(row.position),
      openAmount: Number(row.open_amount),
      openTime: row.open_time,
      closeReason: row.close_reason,
      remark: row.remark,
      profitLoss: Number(row.profit_loss),
      date: row.date,
      isClosed: row.is_closed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ trades });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { balanceManager } = await import('@/storage/database');

    await client.query('BEGIN');

    // 处理 SQL 值，防止 SQL 注入，并为缺失字段提供默认值
    const symbol = body.symbol || '';
    const strategy = (body.strategy || '').replace(/'/g, "''");
    const position = body.position ?? 0;
    const openAmount = String(body.openAmount ?? 0);
    const openTime = (body.openTime || '').replace(/'/g, "''");
    const date = body.date || '';
    const isClosed = body.isClosed ?? true;

    // 处理可选字段
    let closeReasonSql = 'NULL';
    if (body.closeReason !== undefined && body.closeReason !== null) {
      closeReasonSql = `'${body.closeReason.replace(/'/g, "''")}'`;
    }

    let remarkSql = 'NULL';
    if (body.remark !== undefined && body.remark !== null) {
      remarkSql = `'${body.remark.replace(/'/g, "''")}'`;
    }

    let profitLoss = '0';
    if (body.profitLoss !== undefined && body.profitLoss !== null) {
      profitLoss = String(body.profitLoss);
    }

    // 执行原始 SQL
    const query = `
      INSERT INTO trades (
        symbol, strategy, position, open_amount, open_time,
        close_reason, remark, profit_loss, date, is_closed
      )
      VALUES (
        '${symbol}', '${strategy}', ${position}, '${openAmount}', '${openTime}',
        ${closeReasonSql}, ${remarkSql}, '${profitLoss}', '${date}', ${isClosed}
      )
      RETURNING *
    `;

    const result = await client.query(query);
    const trade = result.rows[0];

    // 计算新余额（如果提供了盈亏金额）
    const currentBalance = await balanceManager.getBalance();
    let newBalance = currentBalance;
    if (body.profitLoss !== undefined && body.profitLoss !== null && body.profitLoss !== '') {
      const profitLossNum = Number(body.profitLoss);
      newBalance = currentBalance + profitLossNum;

      // 余额不能为负数
      if (newBalance < 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }

      // 更新余额
      await balanceManager.updateBalance({ amount: newBalance });
    }

    await client.query('COMMIT');

    return NextResponse.json({
      trade: {
        id: trade.id,
        symbol: trade.symbol,
        strategy: trade.strategy,
        position: Number(trade.position),
        openAmount: Number(trade.open_amount),
        openTime: trade.open_time,
        closeReason: trade.close_reason,
        remark: trade.remark,
        profitLoss: Number(trade.profit_loss),
        date: trade.date,
        isClosed: trade.is_closed,
        createdAt: trade.created_at,
        updatedAt: trade.updated_at,
      },
      balance: newBalance,
    });
  } catch (error: any) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      // Ignore rollback error
    }
    console.error('Error creating trade:', error);
    return NextResponse.json({
      error: 'Failed to create trade',
      details: error?.message || 'Unknown error',
    }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { id, profitLoss: newProfitLoss, ...data } = body;
    const { balanceManager } = await import('@/storage/database');

    await client.query('BEGIN');

    // 获取旧交易记录
    const oldTradeResult = await client.query('SELECT * FROM trades WHERE id = $1', [id]);
    if (oldTradeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }
    const oldTrade = oldTradeResult.rows[0];

    // 如果没有传递新的 profitLoss，使用旧值
    const actualNewProfitLoss = newProfitLoss !== undefined && newProfitLoss !== null && newProfitLoss !== ''
      ? newProfitLoss
      : Number(oldTrade.profit_loss);

    // 构建更新 SQL
    const updateParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.symbol !== undefined) {
      updateParts.push(`symbol = $${paramIndex}`);
      values.push(data.symbol);
      paramIndex++;
    }
    if (data.strategy !== undefined) {
      updateParts.push(`strategy = $${paramIndex}`);
      values.push(data.strategy);
      paramIndex++;
    }
    if (data.position !== undefined) {
      updateParts.push(`position = $${paramIndex}`);
      values.push(data.position);
      paramIndex++;
    }
    if (data.openAmount !== undefined) {
      updateParts.push(`open_amount = $${paramIndex}`);
      values.push(String(data.openAmount));
      paramIndex++;
    }
    if (data.openTime !== undefined) {
      updateParts.push(`open_time = $${paramIndex}`);
      values.push(data.openTime);
      paramIndex++;
    }
    if (data.closeReason !== undefined) {
      updateParts.push(`close_reason = $${paramIndex}`);
      values.push(data.closeReason);
      paramIndex++;
    }
    if (data.remark !== undefined) {
      updateParts.push(`remark = $${paramIndex}`);
      values.push(data.remark);
      paramIndex++;
    }
    if (newProfitLoss !== undefined && newProfitLoss !== null && newProfitLoss !== '') {
      updateParts.push(`profit_loss = $${paramIndex}`);
      values.push(String(newProfitLoss));
      paramIndex++;
    }
    if (data.date !== undefined) {
      updateParts.push(`date = $${paramIndex}`);
      values.push(data.date);
      paramIndex++;
    }
    if (data.isClosed !== undefined) {
      updateParts.push(`is_closed = $${paramIndex}`);
      values.push(data.isClosed);
      paramIndex++;
    }

    updateParts.push(`updated_at = $${paramIndex}`);
    values.push(new Date());
    paramIndex++;

    values.push(id); // WHERE clause

    const updateQuery = `
      UPDATE trades
      SET ${updateParts.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const tradeResult = await client.query(updateQuery, values);
    if (tradeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }
    const trade = tradeResult.rows[0];

    // 计算余额变化（仅当盈亏值发生变化时）
    const currentBalance = await balanceManager.getBalance();
    let newBalance = currentBalance;

    // 检查盈亏值是否真的发生了变化
    const oldProfitLoss = Number(oldTrade.profit_loss);
    if (oldProfitLoss !== Number(actualNewProfitLoss)) {
      const balanceChange = Number(actualNewProfitLoss) - oldProfitLoss;
      newBalance = currentBalance + balanceChange;

      // 余额不能为负数
      if (newBalance < 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }

      // 更新余额
      await balanceManager.updateBalance({ amount: newBalance });
    }

    await client.query('COMMIT');

    return NextResponse.json({
      trade: {
        id: trade.id,
        symbol: trade.symbol,
        strategy: trade.strategy,
        position: Number(trade.position),
        openAmount: Number(trade.open_amount),
        openTime: trade.open_time,
        closeReason: trade.close_reason,
        remark: trade.remark,
        profitLoss: Number(trade.profit_loss),
        date: trade.date,
        isClosed: trade.is_closed,
        createdAt: trade.created_at,
        updatedAt: trade.updated_at,
      },
      balance: newBalance,
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      // Ignore rollback error
    }
    console.error('Error updating trade:', error);
    return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const { balanceManager } = await import('@/storage/database');

    if (!id) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 获取要删除的交易记录
    const tradeToDeleteResult = await client.query('SELECT * FROM trades WHERE id = $1', [id]);
    if (tradeToDeleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }
    const tradeToDelete = tradeToDeleteResult.rows[0];

    // 计算新余额
    const currentBalance = await balanceManager.getBalance();
    const newBalance = currentBalance - Number(tradeToDelete.profit_loss);

    // 余额不能为负数
    if (newBalance < 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 删除交易记录
    await client.query('DELETE FROM trades WHERE id = $1', [id]);

    // 更新余额
    await balanceManager.updateBalance({ amount: newBalance });

    await client.query('COMMIT');

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      // Ignore rollback error
    }
    console.error('Error deleting trade:', error);
    return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 });
  } finally {
    client.release();
  }
}
