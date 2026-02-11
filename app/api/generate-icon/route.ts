/**
 * 临时工具：用于生成网页图标的 API 路由
 * 使用场景：需要更换网站 favicon 或图标时调用此接口
 * 注意：这是一个开发/管理工具，生产环境可以根据需要移除或限制访问权限
 */
import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    const response = await client.generate({
      prompt: prompt || 'A professional candlestick chart icon for financial trading, minimalist design, red and green colors, solid background, icon style',
      size: '512x512',
      watermark: false,
    });

    const helper = client.getResponseHelper(response);

    if (helper.success && helper.imageUrls.length > 0) {
      // 下载图片
      const imageData = await axios.get(helper.imageUrls[0], { responseType: 'arraybuffer' });

      // 保存到 public 目录
      const publicDir = path.join(process.cwd(), 'public');
      const iconPath = path.join(publicDir, 'favicon.png');

      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      fs.writeFileSync(iconPath, imageData.data);

      return NextResponse.json({
        success: true,
        iconUrl: '/favicon.png',
      });
    } else {
      return NextResponse.json({
        success: false,
        error: helper.errorMessages.join(', '),
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error generating icon:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate icon',
    }, { status: 500 });
  }
}
