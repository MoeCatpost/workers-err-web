// 配置选项
const CONFIG = {
  // 目标后端服务器（如果需要代理到其他服务器）
  TARGET_HOST: null, // 例如: 'api.example.com'
  
  // 是否启用错误页面拦截
  ENABLE_ERROR_PAGES: true,
  
  // 需要拦截的错误状态码
  ERROR_CODES: [400, 401, 403, 404, 500, 502, 503, 504]
};

const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>糟糕！出错了喵~</title>
  <style>
    body { font-family: "Segoe UI", "PingFang SC", "Hiragino Sans", Arial, sans-serif; margin: 2em; }
    .btn { padding: .5em 1em; margin: .5em; border: none; border-radius: 4px; cursor: pointer; }
    .btn-primary { background: #4e8cff; color: #fff; }
    .btn-secondary { background: #eee; color: #333; }
    [data-theme="dark"] body { background: #222; color: #eee; }
  </style>
</head>
<body>
  <h1 data-i18n="title">糟糕！出错了喵~</h1>
  <p data-i18n="desc">小猫咪不小心碰倒鱼缸啦！请稍后重试。</p>
  <div class="info">
    <strong data-i18n="errcode">错误代码：</strong><span>{ERROR_CODE}</span><br>
    <strong data-i18n="errurl">请求地址：</strong><span>{ERROR_URL}</span>
  </div>
  <div class="links">
    <a href="https://catpost.link" class="btn btn-primary" data-i18n="btn_home">回到猫窝</a>
    <button class="btn btn-secondary" onclick="location.reload()" data-i18n="btn_reload">刷新试试</button>
  </div>
  <script>
    const i18n = {
      "zh": { title: "糟糕！粗问题了喵~", desc: "小猫咪不小心碰倒鱼缸啦！等等再来吧(；´Д\`A", errcode: "错误代码：", errurl: "请求地址：", btn_home: "回到猫窝", btn_reload: "刷新试试" },
      "ja": { title: "エラーですにゃ〜", desc: "猫ちゃんが水槽をひっくり返してしまったようです… 再度お試しください。(；´Д\`A", errcode: "エラーコード：", errurl: "アドレス：", btn_home: "ホームへ戻る", btn_reload: "更新" },
      "en": { title: "Oops! Something went wrong meow ~", desc: "The kitty accidentally knocked over the fish tank. Please try again later.(；´Д\`A", errcode: "Error Code:", errurl: "Requested URL:", btn_home: "Go Home", btn_reload: "Reload" }
    };
    let currentLang = 'zh';
    function applyLang(lang) {
      if (!i18n[lang]) lang = 'zh';
      currentLang = lang;
      document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = i18n[lang][el.dataset.i18n];
      });
      const html = document.documentElement;
      html.lang = lang;
      html.style.fontSize = (lang === 'ja' || lang === 'zh') ? '.98rem' : '1rem';
      localStorage.setItem('pref_lang', lang);
    }
    function toggleLang() {
      const langs = ['zh', 'en', 'ja'];
      const idx = (langs.indexOf(currentLang) + 1) % langs.length;
      applyLang(langs[idx]);
    }
    function toggleTheme() {
      if (document.body.dataset.theme === 'dark' || (!document.body.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.dataset.theme = 'light';
        localStorage.setItem('theme', 'light');
      } else {
        document.body.dataset.theme = 'dark';
        localStorage.setItem('theme', 'dark');
      }
    }
    (() => {
      const savedLang = localStorage.getItem('pref_lang');
      const autoLang = (navigator.language || navigator.languages[0] || 'zh').slice(0, 2);
      applyLang(savedLang || autoLang);
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) document.body.dataset.theme = savedTheme;
      else if (window.matchMedia('(prefers-color-scheme: dark)').matches)
        document.body.dataset.theme = 'dark';
    })();
  </script>
</body>
</html>
`;

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,HEAD,OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': 'ETag,Content-Length,Content-Range,Accept-Ranges,Content-Type,Authorization,Origin,Access-Control-Allow-Origin',
  'Access-Control-Max-Age': '3600'
};

async function handleRequest(request) {
  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS
    });
  }
  
  try {
    const url = new URL(request.url);
    
    // 如果是错误页面路径，直接返回错误页面
    if (url.pathname === '/error') {
      const code = url.searchParams.get('code') || '404';
      return renderErrorPage({
        code: parseInt(code),
        url: request.url
      });
    }
    
    // 构建目标请求URL
    let targetUrl;
    if (CONFIG.TARGET_HOST) {
      // 如果配置了目标主机，则代理到该主机
      targetUrl = new URL(request.url);
      targetUrl.hostname = CONFIG.TARGET_HOST;
    } else {
      // 否则使用原始URL（适用于同域名下的请求处理）
      targetUrl = new URL(request.url);
    }
    
    // 创建新的请求对象
    const modifiedRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null
    });
    
    let response;
    
    // 如果没有配置目标主机，直接返回静态内容或错误页面
    if (!CONFIG.TARGET_HOST) {
      // 这里可以添加静态文件服务逻辑
      // 目前直接返回404错误页面作为示例
      return renderErrorPage({
        code: 404,
        url: request.url
      });
    }
    
    response = await fetch(modifiedRequest);
    
    // 拦截4xx/5xx错误
    if (CONFIG.ENABLE_ERROR_PAGES && CONFIG.ERROR_CODES.includes(response.status)) {
      return renderErrorPage({
        code: response.status,
        url: request.url
      });
    }
    
    // 添加CORS头到正常响应
    const newHeaders = new Headers(response.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      newHeaders.set(k, v);
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  } catch (error) {
    console.error('Worker error:', error);
    // 处理网络错误
    return renderErrorPage({
      code: 503,
      url: request.url
    });
  }
}

function renderErrorPage({ code, url }) {
  const content = HTML_TEMPLATE
    .replace(/{ERROR_CODE}/g, code)
    .replace(/{ERROR_URL}/g, url);
  return new Response(content, {
    status: code,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-cache',
      ...CORS_HEADERS
    }
  });
}