# Artfaker / Yumira Studios

## Usar sem internet

O projeto inclui localmente as bibliotecas, fontes, imagens e o modelo 3D. Extraia o ZIP inteiro e abra `home.html` no navegador. Também é possível abrir `index.html` para ir direto ao museu.

Ao abrir os arquivos diretamente, o navegador pode bloquear o carregamento do modelo 3D grande por segurança. Nesse modo, a recepção usa um personagem 3D simplificado; o restante do museu funciona normalmente.

Para usar o personagem original, inicie um servidor local dentro da pasta extraída:

```bash
python -m http.server 8000
```

No Windows, também pode ser necessário usar `py -m http.server 8000`. Depois, abra `http://localhost:8000/home.html`. O servidor funciona apenas no seu computador e não precisa de internet.
