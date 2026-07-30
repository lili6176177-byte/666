/**
 * 简易汉字 → 拼音首字母 / 全拼（内置常用表，用于点餐拼音搜索）
 * 未收录字保留原字符或跳过
 */

const MAP: Record<string, string> = {
  一: 'yi', 二: 'er', 三: 'san', 四: 'si', 五: 'wu', 六: 'liu', 七: 'qi', 八: 'ba', 九: 'jiu', 十: 'shi',
  百: 'bai', 威: 'wei', 啤: 'pi', 酒: 'jiu', 雪: 'xue', 碧: 'bi', 冰: 'bing', 红: 'hong', 茶: 'cha',
  绿: 'lv', 花: 'hua', 生: 'sheng', 米: 'mi', 轩: 'xuan', 尼: 'ni', 诗: 'shi', 开: 'kai', 房: 'fang',
  套: 'tao', 餐: 'can', 路: 'lu', 易: 'yi', 十: 'shi', 三: 'san', 洋: 'yang', 水: 'shui', 类: 'lei',
  食: 'shi', 品: 'pin', 小: 'xiao', 吃: 'chi', 大: 'da', 中: 'zhong', 特: 'te', 辣: 'la', 度: 'du',
  温: 'wen', 常: 'chang', 加: 'jia', 热: 're', 不: 'bu', 微: 'wei', 瓶: 'ping', 杯: 'bei', 份: 'fen',
  打: 'da', 会: 'hui', 员: 'yuan', 超: 'chao', 市: 'shi', 包: 'bao', 价: 'jia', 成: 'cheng', 本: 'ben',
  果: 'guo', 汁: 'zhi', 牛: 'niu', 排: 'pai', 鸡: 'ji', 翅: 'chi', 鱼: 'yu', 虾: 'xia', 蟹: 'xie',
  面: 'mian', 饭: 'fan', 粥: 'zhou', 汤: 'tang', 菜: 'cai', 肉: 'rou', 蛋: 'dan', 奶: 'nai', 咖: 'ka',
  啡: 'fei', 柠: 'ning', 檬: 'meng', 橙: 'cheng', 芒: 'mang', 果: 'guo', 葡: 'pu', 萄: 'tao',
  王: 'wang', 老: 'lao', 吉: 'ji', 可: 'ke', 乐: 'le', 芬: 'fen', 达: 'da', 脉: 'mai', 动: 'dong',
  皇: 'huang', 冠: 'guan', 芝: 'zhi', 士: 'shi', 巧: 'qiao', 克: 'ke', 力: 'li', 香: 'xiang', 蕉: 'jiao',
  苹: 'ping', 西: 'xi', 瓜: 'gua', 土: 'tu', 豆: 'dou', 腐: 'fu', 炸: 'zha', 烤: 'kao', 蒸: 'zheng',
  煮: 'zhu', 炒: 'chao', 烧: 'shao', 拌: 'ban', 凉: 'liang', 拼: 'pin', 盘: 'pan', 礼: 'li', 盒: 'he',
  新: 'xin', 鲜: 'xian', 特: 'te', 惠: 'hui', 优: 'you', 选: 'xuan', 精: 'jing', 品: 'pin',
  厅: 'ting', 房: 'fang', 台: 'tai', 桌: 'zhuo', 卡: 'ka', 座: 'zuo', 包: 'bao', 厢: 'xiang',
  送: 'song', 买: 'mai', 赠: 'zeng', 免: 'mian', 单: 'dan', 结: 'jie', 账: 'zhang', 收: 'shou',
  银: 'yin', 支: 'zhi', 付: 'fu', 宝: 'bao', 微: 'wei', 信: 'xin', 现: 'xian', 金: 'jin',
  张: 'zhang', 李: 'li', 陈: 'chen', 刘: 'liu', 赵: 'zhao', 黄: 'huang', 周: 'zhou', 吴: 'wu',
  和: 'he', 的: 'de', 了: 'le', 在: 'zai', 是: 'shi', 有: 'you', 人: 'ren', 我: 'wo', 他: 'ta',
  们: 'men', 这: 'zhe', 那: 'na', 个: 'ge', 上: 'shang', 下: 'xia', 来: 'lai', 去: 'qu',
  子: 'zi', 儿: 'er', 头: 'tou', 里: 'li', 外: 'wai', 前: 'qian', 后: 'hou', 左: 'zuo', 右: 'you',
  白: 'bai', 黑: 'hei', 蓝: 'lan', 黄: 'huang', 紫: 'zi', 粉: 'fen', 灰: 'hui', 金: 'jin', 银: 'yin',
  龙: 'long', 凤: 'feng', 虎: 'hu', 豹: 'bao', 马: 'ma', 羊: 'yang', 猪: 'zhu', 狗: 'gou', 猫: 'mao',
  路易: 'luyi', // multi not used
}

/** 全拼（小写无空格） */
export function toPinyin(text: string): string {
  if (!text) return ''
  let out = ''
  for (const ch of text) {
    if (/[a-zA-Z0-9]/.test(ch)) {
      out += ch.toLowerCase()
      continue
    }
    if (/\s/.test(ch)) continue
    const py = MAP[ch]
    if (py) out += py
    else out += ch
  }
  return out
}

/** 拼音首字母串，如「百威」→「bw」 */
export function toPinyinInitials(text: string): string {
  if (!text) return ''
  let out = ''
  for (const ch of text) {
    if (/[a-zA-Z0-9]/.test(ch)) {
      out += ch.toLowerCase()
      continue
    }
    if (/\s/.test(ch)) continue
    const py = MAP[ch]
    if (py) out += py[0]
  }
  return out
}

/** 点餐搜索用：全拼 + 首字母 + 原名 */
export function pinyinIndex(name: string): string {
  const full = toPinyin(name)
  const ini = toPinyinInitials(name)
  return `${full} ${ini} ${name}`.toLowerCase()
}
