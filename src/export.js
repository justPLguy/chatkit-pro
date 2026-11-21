// ChatKit Pro — eksport czatów do Markdown / HTML / PDF.
(() => {
  const CK = window.CK;

  const roleName = r => (r === "user" ? CK.t("exp.you") : "ChatGPT");

  function toMarkdown(c) {
    const head = `# ${c.title}\n\n` +
      `> ${CK.t("exp.created")}: ${CK.fmtDate(c.create_time, true)} · ${CK.t("exp.updated")}: ${CK.fmtDate(c.update_time, true)}  \n` +
      `> https://chatgpt.com/c/${c.id}\n`;
    const body = c.msgs.map(m => `### ${m.role === "user" ? "👤" : "🤖"} ${roleName(m.role)}${m.time ? " · " + CK.fmtDate(m.time, true) : ""}\n\n${m.text}`).join("\n\n");
    return head + "\n" + body + "\n";
  }

  // Markdown z nagłówkiem YAML (Obsidian, Notion, Logseq…): tytuł, daty, link, folder, tagi.
  function folderPath(id) {
    const parts = []; let f = id && CK.folders.get(id), guard = 0;
    while (f && guard++ < 20) { parts.unshift(f.name); f = f.parent && CK.folders.get(f.parent); }
    return parts.join("/");
  }
  const iso = v => CK.toDate(v)?.toISOString().replace(/\.\d{3}Z$/, "Z") || "";
  function toFrontmatter(c) {
    const q = v => JSON.stringify(String(v)); // podwójne cudzysłowy = poprawny YAML
    const folder = folderPath(CK.store.data.chatFolder[c.id]);
    const tags = ["chatgpt", ...CK.tags.of(c.id)];
    const lines = ["---", `title: ${q(c.title)}`, "source: ChatGPT", `url: https://chatgpt.com/c/${c.id}`];
    if (iso(c.create_time)) lines.push(`created: ${iso(c.create_time)}`);
    if (iso(c.update_time)) lines.push(`updated: ${iso(c.update_time)}`);
    if (folder) lines.push(`folder: ${q(folder)}`);
    if (CK.store.data.stars[c.id]) lines.push("starred: true");
    lines.push("tags:", ...tags.map(g => "  - " + q(g)), "---", "");
    const body = c.msgs.map(m => `## ${m.role === "user" ? "👤" : "🤖"} ${roleName(m.role)}${m.time ? " · " + CK.fmtDate(m.time, true) : ""}\n\n${m.text}`).join("\n\n");
    return lines.join("\n") + `# ${c.title}\n\n` + body + "\n";
  }

  // Bardzo lekki markdown -> HTML (bloki kodu, kod inline, pogrubienia, nagłówki, linki).
  function mdLite(text) {
    const parts = [];
    const re = /```([\w+-]*)\n?([\s\S]*?)```/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      parts.push({ t: "txt", v: text.slice(last, m.index) });
      parts.push({ t: "code", lang: m[1], v: m[2] });
      last = re.lastIndex;
    }
    parts.push({ t: "txt", v: text.slice(last) });
    return parts.map(p => {
      if (p.t === "code") return `<pre><code>${CK.esc(p.v.replace(/\n$/, ""))}</code></pre>`;
      let h = CK.esc(p.v);
      h = h.replace(/`([^`\n]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
        .replace(/^#{1,6} (.+)$/gm, "<strong class=h>$1</strong>")
        .replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1">$1</a>');
      return h.trim() ? `<div class="txt">${h.trim()}</div>` : "";
    }).join("");
  }

  const CSS = `
    body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:860px;margin:32px auto;padding:0 20px;color:#1f2328;line-height:1.55}
    h1{font-size:22px;margin:40px 0 4px;page-break-before:always}
    h1:first-of-type{page-break-before:avoid}
    .meta{color:#666;font-size:12px;margin-bottom:18px}
    .msg{border-radius:10px;padding:12px 16px;margin:12px 0;page-break-inside:avoid}
    .user{background:#eef4ff}.assistant{background:#f6f6f6}
    .who{font-size:12px;color:#555;margin-bottom:6px;font-weight:600}
    .txt{white-space:pre-wrap}
    pre{background:#1e1e1e;color:#eee;padding:10px 12px;border-radius:8px;overflow-x:auto;white-space:pre-wrap;font-size:12.5px}
    code{font-family:ui-monospace,Consolas,monospace}
    .txt code{background:#e8e8e8;padding:1px 4px;border-radius:4px}
    .h{display:block;font-size:15px;margin-top:6px}
    a{color:#2563eb}`;

  function toHtmlSection(c) {
    return `<h1>${CK.esc(c.title)}</h1>
<div class="meta">${CK.t("exp.created")}: ${CK.fmtDate(c.create_time, true)} · ${CK.t("exp.updated")}: ${CK.fmtDate(c.update_time, true)} · <a href="https://chatgpt.com/c/${c.id}">${CK.t("exp.openIn")}</a></div>
${c.msgs.map(m => `<div class="msg ${m.role}"><div class="who">${m.role === "user" ? "👤" : "🤖"} ${roleName(m.role)}${m.time ? " · " + CK.fmtDate(m.time, true) : ""}</div>${mdLite(m.text)}</div>`).join("\n")}`;
  }

  const htmlDoc = (title, convs) => `<!DOCTYPE html><html lang="${CK.lang || "en"}"><head><meta charset="utf-8"><title>${CK.esc(title)}</title><style>${CSS}</style></head><body>${convs.map(toHtmlSection).join("\n")}</body></html>`;

  function printHtml(html) {
    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(f);
    f.onload = () => {
      try { f.contentWindow.focus(); f.contentWindow.print(); }
      catch (e) { console.error(e); }
      setTimeout(() => f.remove(), 60000);
    };
    f.srcdoc = html;
  }

  const toJson = c => JSON.stringify({ id: c.id, title: c.title, url: "https://chatgpt.com/c/" + c.id,
    created: CK.toDate(c.create_time)?.toISOString() || null, updated: CK.toDate(c.update_time)?.toISOString() || null,
    messages: c.msgs.map(m => ({ role: m.role, time: CK.toDate(m.time)?.toISOString() || null, text: m.text })) }, null, 2);

  // Jeden plik na czat: „2026-11-17 Tytuł.md” (data ostatniej zmiany), w ZIP-ie.
  function zipChats(convs, kind) {
    const ext = kind === "json" ? "json" : kind === "obs" ? "md" : kind;
    const files = convs.map(c => {
      const d = CK.toDate(c.update_time) || CK.toDate(c.create_time);
      const stamp = d ? d.toISOString().slice(0, 10) + " " : "";
      const data = kind === "md" ? toMarkdown(c) : kind === "obs" ? toFrontmatter(c) : kind === "html" ? htmlDoc(c.title, [c]) : toJson(c);
      return { name: stamp + CK.safeName(c.title) + "." + ext, data, date: d || undefined };
    });
    return CK.zip(files);
  }

  // ids: lista id czatów; format: "md" | "obs" | "html" | "pdf" | "zip-md" | "zip-html" | "zip-json"
  // opts.pick(conv) — opcjonalnie: wybór wiadomości; zwraca { msgs, format } albo null (= anuluj)
  CK.exportChats = async (ids, format, onProgress = () => {}, name, opts = {}) => {
    const convs = [];
    let fail = 0;
    for (let i = 0; i < ids.length; i++) {
      try {
        // eksport zawsze ze świeżej wersji czatu (bez 2-minutowej pamięci podręcznej)
        const conv = await CK.getConversation(ids[i], { fresh: true });
        convs.push({ id: ids[i], title: conv.title || CK.t("untitled"), create_time: conv.create_time, update_time: conv.update_time, msgs: CK.linearize(conv) });
      } catch (e) { fail++; console.warn("[ChatKit Pro] eksport", ids[i], e); }
      onProgress(i + 1, ids.length);
      if (i < ids.length - 1) await CK.sleep(600);
    }
    if (!convs.length) throw new Error(CK.t("exp.noneFetched"));
    if (opts.pick) {
      const r = await opts.pick(convs[0]);
      if (!r) return { ok: 0, fail: 0, cancelled: true };
      convs[0] = { ...convs[0], msgs: r.msgs };
      format = r.format;
    }
    const date = new Date().toISOString().slice(0, 10);
    const base = CK.safeName(name || (convs.length === 1 ? convs[0].title : `chatgpt-export-${date}`));
    const docTitle = convs.length === 1 ? convs[0].title : `${CK.t("exp.title")} (${convs.length}) — ${date}`;
    if (format.startsWith("zip-")) CK.download(CK.safeName(name || `chatgpt-export-${date}`) + ".zip", zipChats(convs, format.slice(4)));
    else if (format === "md") CK.download(base + ".md", convs.map(toMarkdown).join("\n---\n\n"), "text/markdown");
    else if (format === "obs") {
      if (convs.length === 1) CK.download(base + ".md", toFrontmatter(convs[0]), "text/markdown");
      else CK.download(CK.safeName(name || `chatgpt-export-${date}`) + ".zip", zipChats(convs, "obs"));
    }
    else if (format === "html") CK.download(base + ".html", htmlDoc(docTitle, convs), "text/html");
    else printHtml(htmlDoc(docTitle, convs));
    return { ok: convs.length, fail };
  };

  CK._export = { toMarkdown, toFrontmatter, mdLite, zipChats, toJson }; // do testów
})();
