import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const accountId = searchParams.get('accountId');

    let query = 'SELECT * FROM trades';
    const params: any[] = [];
    const conditions: string[] = [];

    if (accountId) {
      conditions.push(`account_id = $${params.length + 1}`);
      params.push(accountId);
    }

    if (startDate && endDate) {
      conditions.push(`date >= $${params.length + 1}`);
      params.push(startDate);
      conditions.push(`date <= $${params.length + 1}`);
      params.push(endDate);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

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
      accountId: row.account_id,
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
    const { accountId } = body;
    const targetAccountId = accountId || 1;

    await client.query('BEGIN');

    // 处理 SQL 值
    const symbol = body.symbol || '';
    const strategy = (body.strategy || '').replace(/'/g, "''");
    const position = body.position ?? 0;
    const openAmount = String(body.openAmount ?? 0);
    const openTime = (body.openTime || '').replace(/'/g, "''");
    const date = body.date || '';
    const isClosed = body.isClosed ?? true;

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
        close_reason, remark, profit_loss, date, is_closed, account_id
      )
      VALUES (
        '${symbol}', '${strategy}', ${position}, '${openAmount}', '${openTime}',
        ${closeReasonSql}, ${remarkSql}, '${profitLoss}', '${date}', ${isClosed}, ${targetAccountId}
      )
      RETURNING *
    `;

    const result = await client.query(query);
    const trade = result.rows[0];

    // 计算新余额
    let newBalance = 0;
    if (body.profitLoss !== undefined && body.profitLoss !== null && body.profitLoss !== '') {
      const profitLossNum = Number(body.profitLoss);
      
      // 获取当前账户余额
      const balanceResult = await client.query(
        'SELECT amount FROM balance WHERE account_id = $1',
        [targetAccountId]
      );
      
      const currentBalance = balanceResult.rows.length > 0 
        ? Number(balanceResult.rows[0].amount)
        : 0;
      
      newBalance = currentBalance + profitLossNum;

      if (newBalance < 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }

      // 更新余额
      if (balanceResult.rows.length > 0) {
        await client.query(
          'UPDATE balance SET amount = $1 WHERE account_id = $2',
          [String(newBalance), targetAccountId]
        );
      } else {
        await client.query(
          'INSERT INTO balance (amount, account_id) VALUES ($1, $2)',
          [String(newBalance), targetAccountId]
        );
      }
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
        accountId: trade.account_id,
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
    const { id, profitLoss: newProfitLoss, accountId, ...data } = body;
    const targetAccountId = accountId || 1;

    await client.query('BEGIN');

    // 获取旧交易记录
    const oldTradeResult = await client.query('SELECT * FROM trades WHERE id = $1', [id]);
    if (oldTradeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }
    const oldTrade = oldTradeResult.rows[0];

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
    if (newProfitLoss !== undefined) {
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

    if (updateParts.length > 0) {
      updateParts.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);
      const updateQuery = `UPDATE trades SET ${updateParts.join(', ')} WHERE id = $${paramIndex}`;
      await client.query(updateQuery, values);
    }

    // 计算新余额
    let newBalance = 0;
    if (newProfitLoss !== undefined) {
      const balanceResult = await client.query(
        'SELECT amount FROM balance WHERE account_id = $1',
        [targetAccountId]
      );
      
      const currentBalance = balanceResult.rows.length > 0 
        ? Number(balanceResult.rows[0].amount)
        : 0;
      
      const oldProfitLoss = Number(oldTrade.profit_loss);
      newBalance = currentBalance - oldProfitLoss + actualNewProfitLoss;

      if (newBalance < 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }

      if (balanceResult.rows.length > 0) {
        await client.query(
          'UPDATE balance SET amount = $1 WHERE account_id = $2',
          [String(newBalance), targetAccountId]
        );
      } else {
        await client.query(
          'INSERT INTO balance (amount, account_id) VALUES ($1, $2)',
          [String(newBalance), targetAccountId]
        );
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({
      trade: { id, ...data, profitLoss: actualNewProfitLoss, accountId: targetAccountId },
      balance: newBalance
    });
  } catch (error: any) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      // Ignore
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
    const accountId = searchParams.get('accountId');
    const targetAccountId = accountId || 1;

    if (!id) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 获取要删除的交易记录
    const tradeResult = await client.query('SELECT * FROM trades WHERE id = $1', [id]);
    if (tradeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const trade = tradeResult.rows[0];
    const profitLoss = Number(trade.profit_loss);

    // 删除交易记录
    await client.query('DELETE FROM trades WHERE id = $1', [id]);

    // 更新余额
    let newBalance = 0;
    if (profitLoss !== 0) {
      const balanceResult = await client.query(
        'SELECT amount FROM balance WHERE account_id = $1',
        [targetAccountId]
      );
      
      const currentBalance = balanceResult.rows.length > 0 
        ? Number(balanceResult.rows[0].amount)
        : 0;
      
      newBalance = currentBalance - profitLoss;

      if (newBalance < 0) {
        newBalance = 0; // 防止负数
      }

      if (balanceResult.rows.length > 0) {
        await client.query(
          'UPDATE balance SET amount = $1 WHERE account_id = $2',
          [String(newBalance), targetAccountId]
        );
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      // Ignore
    }
    console.error('Error deleting trade:', error);
    return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 });
  } finally {
    client.release();
  }
}
