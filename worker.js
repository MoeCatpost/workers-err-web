[
    {
      "AllowedOrigins": ["*"
      ],
      
      "AllowedMethods": ["GET", 
        "PUT", 
        "POST", 
        "DELETE", 
        "HEAD"
      ],
      
      "AllowedHeaders": ["*"
      ],
      
      "ExposeHeaders": ["ETag", 
        "Content-Length", 
        "Content-Range", 
        "Accept-Ranges",
        "Content-Type",
        "Authorization",
        "Origin",
        "Access-Control-Allow-Origin"
      ],
      
      "MaxAgeSeconds": 3600
    }
  ]
const HTML_TEMPLATE = `
<!DOCTYPE html>
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
  </div>

  <script>
  const i18n={
    "zh":{
      title:"糟糕！粗问题了喵~",
      desc:"小猫咪不小心碰倒鱼缸啦！等等再来吧(；´Д`A",
      errcode:"错误代码：",
      errurl:"请求地址：",
      btn_home:"回到猫窝",
      btn_reload:"刷新试试"
    },
    "ja":{
      title:"エラーですにゃ〜",
      desc:"猫ちゃんが水槽をひっくり返してしまったようです… 再度お試しください。(；´Д`A",
      errcode:"エラーコード：",
      errurl:"アドレス：",
      btn_home:"ホームへ戻る",
      btn_reload:"更新"
    },
    "en":{
      title:"Oops! Something went wrong meow ~",
      desc:"The kitty accidentally knocked over the fish tank. Please try again later.(；´Д`A",
      errcode:"Error Code:",
      errurl:"Requested URL:",
      btn_home:"Go Home",
      btn_reload:"Reload"
    }
  };

  let currentLang='zh';
  function applyLang(lang){
    if(!i18n[lang]) lang='zh';
    currentLang=lang;
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      el.textContent=i18n[lang][el.dataset.i18n];
    });
    const html=document.documentElement;
    html.lang=lang;
    html.style.fontSize=(lang==='ja'||lang==='zh')?'.98rem':'1rem';
    localStorage.setItem('pref_lang',lang);
  }
  function toggleLang(){
    const langs=['zh','en','ja'];
    const idx=(langs.indexOf(currentLang)+1)%langs.length;
    applyLang(langs[idx]);
  }

  /* 主题切换 */
  function toggleTheme(){
    if(document.body.dataset.theme==='dark' || (!document.body.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)){
      document.body.dataset.theme='light';
      localStorage.setItem('theme','light');
    }else{
      document.body.dataset.theme='dark';
      localStorage.setItem('theme','dark');
    }
  }

  /* 初始化语言 & 主题 */
  (()=>{
    const savedLang=localStorage.getItem('pref_lang');
    const autoLang=(navigator.language||navigator.languages[0]||'zh').slice(0,2);
    applyLang(savedLang||autoLang);

    const savedTheme=localStorage.getItem('theme');
    if(savedTheme) document.body.dataset.theme=savedTheme;
    else if(window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.body.dataset.theme='dark';
  })();
  </script>
</body>
</html>
`;

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  try {
    const response = await fetch(request);
    
    // 拦截4xx/5xx错误
    if (response.status >= 400) {
      return renderErrorPage({
        code: response.status,
        url: request.url
      });
    }
    return response;
  } catch (error) {
    // 处理网络错误
    return renderErrorPage({
      code: 503,
      url: request.url
    });
  }
}

function renderErrorPage({ code, url }) {
  // 替换占位符
  const content = HTML_TEMPLATE
    .replace(/{ERROR_CODE}/g, code)
    .replace(/{ERROR_URL}/g, url);

  return new Response(content, {
    status: code,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-cache'
    }
  });
}
