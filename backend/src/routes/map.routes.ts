/**
 * 高德地图代理接口
 *
 * 小程序不直接暴露 Key，统一走后端代理请求高德 Web 服务 API。
 * Key 从 process.env.AMAP_KEY 读取，配置在 .env 文件中。
 *
 * 接口列表：
 *   GET /api/map/school/search?keyword=xxx
 *   GET /api/map/reverse-geocode?latitude=xx&longitude=xx
 */
import { Router, Request, Response } from 'express';
import { success, fail } from '../utils/response';
import logger from '../utils/logger';

const router = Router();

const AMAP_BASE = 'https://restapi.amap.com';

function getKey(): string {
  const key = process.env.AMAP_KEY;
  if (!key) throw new Error('AMAP_KEY 未配置，请在 .env 中设置');
  return key;
}

function formatAmapError(data: Record<string, unknown>): string {
  const info = String(data.info ?? '未知');
  if (info === 'USERKEY_PLAT_NOMATCH') {
    return '高德 Key 平台类型不匹配，请在高德控制台配置 Web服务 Key';
  }
  return `高德接口错误：${info}`;
}

// GET /api/map/school/search?keyword=xxx&city=xxx
router.get('/school/search', async (req: Request, res: Response) => {
  try {
    const { keyword, city } = req.query as Record<string, string>;
    if (!keyword?.trim()) {
      fail(res, '搜索关键词不能为空', 400, 400);
      return;
    }

    const params = new URLSearchParams({
      keywords: keyword.trim(),
      types:    '141201|141202|141203|141204',  // 高德 POI：小学/中学/大学/幼儿园
      key:      getKey(),
      output:   'JSON',
      offset:   '20',
      page:     '1',
    });
    if (city?.trim()) params.set('city', city.trim());

    const url = `${AMAP_BASE}/v3/place/text?${params}`;
    const resp = await fetch(url);
    const data = await resp.json() as Record<string, unknown>;

    if (data.status !== '1') {
      logger.warn({ amapInfo: data.info }, '[Map] 高德学校搜索失败');
      fail(res, formatAmapError(data), 502, 502);
      return;
    }

    const pois = (data.pois as Array<Record<string, unknown>>) ?? [];
    const list = pois.map((p) => ({
      id:        p.id,
      name:      p.name,
      address:   p.address,
      location:  p.location,   // "经度,纬度"
      district:  p.adname,
      city:      p.cityname,
    }));

    success(res, { list, total: list.length });
  } catch (e) {
    logger.error({ err: e }, '[Map] school/search 异常');
    fail(res, (e as Error).message);
  }
});

// GET /api/map/reverse-geocode?latitude=xx&longitude=xx
router.get('/reverse-geocode', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.query as Record<string, string>;
    if (!latitude || !longitude) {
      fail(res, '经纬度不能为空', 400, 400);
      return;
    }

    const params = new URLSearchParams({
      location: `${longitude},${latitude}`,
      key:      getKey(),
      output:   'JSON',
    });

    const url = `${AMAP_BASE}/v3/geocode/regeo?${params}`;
    const resp = await fetch(url);
    const data = await resp.json() as Record<string, unknown>;

    if (data.status !== '1') {
      logger.warn({ amapInfo: data.info }, '[Map] 逆地理编码失败');
      fail(res, formatAmapError(data), 502, 502);
      return;
    }

    const regeo = data.regeocode as Record<string, unknown>;
    success(res, {
      address:   regeo.formatted_address,
      province:  (regeo.addressComponent as Record<string, unknown>)?.province,
      city:      (regeo.addressComponent as Record<string, unknown>)?.city,
      district:  (regeo.addressComponent as Record<string, unknown>)?.district,
    });
  } catch (e) {
    logger.error({ err: e }, '[Map] reverse-geocode 异常');
    fail(res, (e as Error).message);
  }
});

export default router;
