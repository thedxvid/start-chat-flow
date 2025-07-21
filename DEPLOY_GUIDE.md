# Guia de Deploy - Start Chat

## Problema Identificado

O erro de "tela branca" estava ocorrendo porque o servidor não estava configurado corretamente para servir uma **Single Page Application (SPA)** React. Os arquivos JavaScript e CSS não estavam sendo servidos com os MIME types corretos.

## Soluções Implementadas

### 1. Configuração do Vite
- Adicionado `base: './'` para usar caminhos relativos
- Configurado chunking manual para otimizar o carregamento
- Configurado diretório de assets corretamente

### 2. Arquivos de Configuração para Deploy

#### Apache (.htaccess)
- ✅ Arquivo criado: `dist/.htaccess`
- Configura redirecionamento para SPA
- Define MIME types corretos
- Adiciona compressão e cache

#### Netlify (_redirects)
- ✅ Arquivo criado: `dist/_redirects`
- Configura redirecionamento para assets estáticos
- Fallback para index.html em rotas não existentes

#### Vercel (vercel.json)
- ✅ Arquivo criado: `dist/vercel.json`
- Configura rewrites e headers
- Define Content-Type correto para JS/CSS

## Instruções de Deploy

### Para Hospedagem Compartilhada (Apache)
1. Faça upload de TODOS os arquivos da pasta `dist/`
2. Certifique-se que o arquivo `.htaccess` foi enviado
3. Se necessário, ative o mod_rewrite no painel de controle

### Para Netlify
1. Arraste a pasta `dist/` para o Netlify
2. O arquivo `_redirects` será automaticamente reconhecido
3. Ou use o Netlify CLI: `netlify deploy --prod --dir=dist`

### Para Vercel
1. Use o Vercel CLI: `vercel --prod`
2. Ou conecte o repositório GitHub no painel Vercel
3. O arquivo `vercel.json` será automaticamente reconhecido

### Para GitHub Pages
1. Configure o GitHub Actions ou use o GitHub Pages diretamente
2. Certifique-se de usar a branch `gh-pages` ou a pasta `docs/`

### Para outros servidores
Se estiver usando outro tipo de servidor:

1. **Nginx**: Adicione estas configurações ao seu `nginx.conf`:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}

location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

2. **Express/Node.js**: Use o middleware de history fallback:
```javascript
const history = require('connect-history-api-fallback');
app.use(history({
    disableDotRule: true,
    verbose: true
}));
```

## Verificação de Deploy

Após o deploy, verifique:

1. ✅ O site carrega sem tela branca
2. ✅ Console do navegador sem erros de MIME type
3. ✅ Arquivos CSS e JS carregam corretamente
4. ✅ Navegação entre páginas funciona
5. ✅ Refresh da página não quebra a aplicação

## Troubleshooting

### Se ainda aparecer tela branca:
1. Abra o console do navegador (F12)
2. Verifique se há erros de carregamento de arquivos
3. Confirme se os arquivos `.htaccess`, `_redirects` ou `vercel.json` estão no servidor
4. Verifique se o servidor suporta as configurações necessárias

### Problemas comuns:
- **404 em assets**: Verifique se a pasta `assets/` foi enviada
- **MIME type errors**: Confirme se o arquivo de configuração está funcionando
- **Routing não funciona**: Verifique se o fallback para `index.html` está ativo

## Arquivos para Upload

Todos os arquivos da pasta `dist/` devem ser enviados:
- `index.html`
- `assets/` (pasta completa)
- `favicon.*`
- `robots.txt`
- `.htaccess` (para Apache)
- `_redirects` (para Netlify)
- `vercel.json` (para Vercel)
- Qualquer outro arquivo público

## Comandos Úteis

```bash
# Gerar nova build
npm run build

# Preview local da build
npm run preview

# Verificar arquivos gerados
ls -la dist/
```

## Próximos Passos

1. Faça upload dos arquivos atualizados da pasta `dist/`
2. Teste se o site carrega corretamente
3. Verifique o console do navegador para confirmar que não há erros
4. Teste a navegação entre páginas

Se ainda houver problemas, verifique os logs do servidor e confirme se o tipo de hospedagem está suportando as configurações necessárias. 