// ChatKit Pro — biblioteka promptów: zmienne {{nazwa}} / {{nazwa|domyślna}}, kategorie,
// wstawianie do pola czatu, szybki wybór (Alt+Shift+P albo wpisz // w pustym polu), pakiet startowy.
(() => {
  const CK = window.CK;
  const t = (...a) => CK.t(...a);

  const STARTER = {
    pl: [
      ["Streść tekst", "Pisanie", "Streść poniższy tekst w {{liczba|5}} punktach. Zachowaj najważniejsze liczby i nazwy.\n\n{{tekst}}"],
      ["Popraw tekst", "Pisanie", "Popraw błędy językowe i stylistyczne w tekście poniżej. Zachowaj mój ton ({{ton|swobodny}}). Pokaż poprawioną wersję, a pod nią listę najważniejszych zmian.\n\n{{tekst}}"],
      ["Mail do…", "Pisanie", "Napisz krótkiego maila do {{odbiorca}} w sprawie: {{sprawa}}. Ton: {{ton|uprzejmy, konkretny}}. Maksymalnie 120 słów."],
      ["Wyjaśnij jak 5-latkowi", "Nauka", "Wyjaśnij {{temat}} tak, jakbym miał 5 lat. Użyj jednej analogii z życia codziennego, a na końcu podaj 3 pytania sprawdzające."],
      ["Przegląd kodu", "Programowanie", "Zrób przegląd poniższego kodu ({{język|Python}}). Wskaż błędy, problemy z bezpieczeństwem i wydajnością. Zaproponuj poprawki z krótkim uzasadnieniem.\n\n```\n{{kod}}\n```"],
      ["Debugowanie błędu", "Programowanie", "Mam błąd w {{technologia}}:\n\n{{komunikat błędu}}\n\nKod:\n```\n{{kod}}\n```\n\nWyjaśnij przyczynę i podaj poprawkę krok po kroku."],
      ["Plusy i minusy", "Decyzje", "Rozważam: {{decyzja}}. Wypisz plusy, minusy, ukryte koszty i ryzyka. Na końcu zadaj mi 3 pytania, które pomogą podjąć decyzję."],
      ["Plan krok po kroku", "Produktywność", "Rozpisz plan osiągnięcia celu: {{cel}} w czasie {{czas|4 tygodnie}}. Podziel na tygodnie, z konkretnymi zadaniami i miernikami postępu."],
      ["Tłumaczenie", "Języki", "Przetłumacz na {{język|angielski}}, zachowując ton i formatowanie. Przy idiomach podaj krótką notkę.\n\n{{tekst}}"],
      ["Burza mózgów", "Kreatywność", "Wymyśl {{liczba|10}} pomysłów na {{temat}}. Każdy w jednym zdaniu. Zaznacz 3 najbardziej oryginalne."]
    ],
    en: [
      ["Summarize", "Writing", "Summarize the text below in {{count|5}} bullet points. Keep key numbers and names.\n\n{{text}}"],
      ["Proofread", "Writing", "Fix grammar and style in the text below. Keep my tone ({{tone|casual}}). Show the corrected version, then a list of the main changes.\n\n{{text}}"],
      ["Email to…", "Writing", "Write a short email to {{recipient}} about: {{topic}}. Tone: {{tone|polite, to the point}}. Max 120 words."],
      ["Explain like I'm 5", "Learning", "Explain {{topic}} like I'm 5. Use one everyday analogy and finish with 3 check questions."],
      ["Code review", "Coding", "Review this {{language|Python}} code. Point out bugs, security and performance issues. Suggest fixes with a short rationale.\n\n```\n{{code}}\n```"],
      ["Debug an error", "Coding", "I have an error in {{technology}}:\n\n{{error message}}\n\nCode:\n```\n{{code}}\n```\n\nExplain the cause and give a step-by-step fix."],
      ["Pros and cons", "Decisions", "I'm considering: {{decision}}. List pros, cons, hidden costs and risks. Then ask me 3 questions that would help me decide."],
      ["Step-by-step plan", "Productivity", "Create a plan to reach this goal: {{goal}} within {{time|4 weeks}}. Break it into weeks with concrete tasks and progress metrics."],
      ["Translate", "Languages", "Translate into {{language|Spanish}}, keeping tone and formatting. Add a short note for idioms.\n\n{{text}}"],
      ["Brainstorm", "Creativity", "Come up with {{count|10}} ideas for {{topic}}. One sentence each. Mark the 3 most original."]
    ],
    fr: [
      ["Résumer", "Écriture", "Résume le texte ci-dessous en {{nombre|5}} points. Garde les chiffres et noms importants.\n\n{{texte}}"],
      ["Corriger", "Écriture", "Corrige la grammaire et le style du texte ci-dessous. Garde mon ton ({{ton|décontracté}}). Montre la version corrigée puis la liste des principales modifications.\n\n{{texte}}"],
      ["E-mail à…", "Écriture", "Rédige un court e-mail à {{destinataire}} au sujet de : {{sujet}}. Ton : {{ton|poli, concis}}. 120 mots maximum."],
      ["Explique comme à un enfant", "Apprentissage", "Explique {{sujet}} comme à un enfant de 5 ans. Utilise une analogie du quotidien et termine par 3 questions de vérification."],
      ["Revue de code", "Programmation", "Fais une revue de ce code {{langage|Python}}. Signale les bugs, problèmes de sécurité et de performance. Propose des corrections justifiées.\n\n```\n{{code}}\n```"],
      ["Déboguer une erreur", "Programmation", "J'ai une erreur en {{technologie}} :\n\n{{message d'erreur}}\n\nCode :\n```\n{{code}}\n```\n\nExplique la cause et donne une correction étape par étape."],
      ["Pour et contre", "Décisions", "J'envisage : {{décision}}. Liste les avantages, inconvénients, coûts cachés et risques. Puis pose-moi 3 questions pour m'aider à décider."],
      ["Plan étape par étape", "Productivité", "Établis un plan pour atteindre : {{objectif}} en {{durée|4 semaines}}. Découpe par semaine avec des tâches concrètes et des indicateurs."],
      ["Traduire", "Langues", "Traduis en {{langue|anglais}} en gardant le ton et la mise en forme. Ajoute une note pour les expressions idiomatiques.\n\n{{texte}}"],
      ["Remue-méninges", "Créativité", "Propose {{nombre|10}} idées pour {{sujet}}. Une phrase chacune. Marque les 3 plus originales."]
    ],
    de: [
      ["Zusammenfassen", "Schreiben", "Fasse den folgenden Text in {{anzahl|5}} Stichpunkten zusammen. Behalte wichtige Zahlen und Namen.\n\n{{text}}"],
      ["Korrekturlesen", "Schreiben", "Korrigiere Grammatik und Stil im folgenden Text. Behalte meinen Ton ({{ton|locker}}). Zeige die korrigierte Fassung und danach die wichtigsten Änderungen.\n\n{{text}}"],
      ["E-Mail an…", "Schreiben", "Schreibe eine kurze E-Mail an {{empfänger}} zum Thema: {{thema}}. Ton: {{ton|höflich, sachlich}}. Maximal 120 Wörter."],
      ["Erklär es wie einem Kind", "Lernen", "Erkläre {{thema}}, als wäre ich 5 Jahre alt. Nutze eine Alltagsanalogie und schließe mit 3 Kontrollfragen."],
      ["Code-Review", "Programmierung", "Prüfe diesen {{sprache|Python}}-Code. Nenne Fehler, Sicherheits- und Performanceprobleme. Schlage begründete Korrekturen vor.\n\n```\n{{code}}\n```"],
      ["Fehler debuggen", "Programmierung", "Ich habe einen Fehler in {{technologie}}:\n\n{{fehlermeldung}}\n\nCode:\n```\n{{code}}\n```\n\nErkläre die Ursache und gib eine schrittweise Lösung."],
      ["Pro und Contra", "Entscheidungen", "Ich überlege: {{entscheidung}}. Liste Vorteile, Nachteile, versteckte Kosten und Risiken auf. Stelle mir dann 3 Fragen, die bei der Entscheidung helfen."],
      ["Schritt-für-Schritt-Plan", "Produktivität", "Erstelle einen Plan für das Ziel: {{ziel}} in {{zeitraum|4 Wochen}}. Gliedere nach Wochen mit konkreten Aufgaben und Messgrößen."],
      ["Übersetzen", "Sprachen", "Übersetze ins {{sprache|Englische}} und behalte Ton und Formatierung bei. Ergänze bei Redewendungen eine kurze Notiz.\n\n{{text}}"],
      ["Brainstorming", "Kreativität", "Finde {{anzahl|10}} Ideen für {{thema}}. Je ein Satz. Markiere die 3 originellsten."]
    ],
    es: [
      ["Resumir", "Escritura", "Resume el texto de abajo en {{número|5}} puntos. Conserva las cifras y los nombres importantes.\n\n{{texto}}"],
      ["Corregir", "Escritura", "Corrige la gramática y el estilo del texto de abajo. Mantén mi tono ({{tono|informal}}). Muestra la versión corregida y luego una lista de los cambios principales.\n\n{{texto}}"],
      ["Correo a…", "Escritura", "Escribe un correo breve a {{destinatario}} sobre: {{asunto}}. Tono: {{tono|cortés, directo}}. Máximo 120 palabras."],
      ["Explícalo como a un niño", "Aprendizaje", "Explica {{tema}} como si tuviera 5 años. Usa una analogía de la vida diaria y termina con 3 preguntas de comprobación."],
      ["Revisión de código", "Programación", "Revisa este código en {{lenguaje|Python}}. Señala errores y problemas de seguridad y rendimiento. Propón correcciones con una breve justificación.\n\n```\n{{código}}\n```"],
      ["Depurar un error", "Programación", "Tengo un error en {{tecnología}}:\n\n{{mensaje de error}}\n\nCódigo:\n```\n{{código}}\n```\n\nExplica la causa y da una solución paso a paso."],
      ["Pros y contras", "Decisiones", "Estoy pensando en: {{decisión}}. Enumera pros, contras, costes ocultos y riesgos. Después hazme 3 preguntas que me ayuden a decidir."],
      ["Plan paso a paso", "Productividad", "Crea un plan para lograr: {{objetivo}} en {{plazo|4 semanas}}. Divídelo por semanas con tareas concretas e indicadores de progreso."],
      ["Traducir", "Idiomas", "Traduce al {{idioma|inglés}} manteniendo el tono y el formato. Añade una nota breve en las expresiones idiomáticas.\n\n{{texto}}"],
      ["Lluvia de ideas", "Creatividad", "Propón {{número|10}} ideas para {{tema}}. Una frase cada una. Marca las 3 más originales."]
    ],
    "pt-BR": [
      ["Resumir", "Escrita", "Resuma o texto abaixo em {{número|5}} tópicos. Mantenha os números e nomes importantes.\n\n{{texto}}"],
      ["Revisar texto", "Escrita", "Corrija a gramática e o estilo do texto abaixo. Mantenha meu tom ({{tom|descontraído}}). Mostre a versão corrigida e depois uma lista das principais mudanças.\n\n{{texto}}"],
      ["E-mail para…", "Escrita", "Escreva um e-mail curto para {{destinatário}} sobre: {{assunto}}. Tom: {{tom|educado, objetivo}}. No máximo 120 palavras."],
      ["Explique como para uma criança", "Aprendizado", "Explique {{tema}} como se eu tivesse 5 anos. Use uma analogia do dia a dia e termine com 3 perguntas de verificação."],
      ["Revisão de código", "Programação", "Revise este código em {{linguagem|Python}}. Aponte bugs e problemas de segurança e desempenho. Sugira correções com uma breve justificativa.\n\n```\n{{código}}\n```"],
      ["Depurar um erro", "Programação", "Tenho um erro em {{tecnologia}}:\n\n{{mensagem de erro}}\n\nCódigo:\n```\n{{código}}\n```\n\nExplique a causa e dê uma solução passo a passo."],
      ["Prós e contras", "Decisões", "Estou pensando em: {{decisão}}. Liste prós, contras, custos ocultos e riscos. Depois me faça 3 perguntas que ajudem a decidir."],
      ["Plano passo a passo", "Produtividade", "Crie um plano para atingir: {{objetivo}} em {{prazo|4 semanas}}. Divida por semanas com tarefas concretas e métricas de progresso."],
      ["Traduzir", "Idiomas", "Traduza para o {{idioma|inglês}}, mantendo o tom e a formatação. Adicione uma nota curta em expressões idiomáticas.\n\n{{texto}}"],
      ["Brainstorm", "Criatividade", "Sugira {{número|10}} ideias para {{tema}}. Uma frase cada. Marque as 3 mais originais."]
    ],
    it: [
      ["Riassumi", "Scrittura", "Riassumi il testo qui sotto in {{numero|5}} punti. Mantieni numeri e nomi importanti.\n\n{{testo}}"],
      ["Correggi", "Scrittura", "Correggi grammatica e stile del testo qui sotto. Mantieni il mio tono ({{tono|informale}}). Mostra la versione corretta e poi l'elenco delle modifiche principali.\n\n{{testo}}"],
      ["E-mail a…", "Scrittura", "Scrivi una breve e-mail a {{destinatario}} riguardo a: {{argomento}}. Tono: {{tono|cortese, diretto}}. Massimo 120 parole."],
      ["Spiegalo come a un bambino", "Apprendimento", "Spiega {{argomento}} come se avessi 5 anni. Usa un'analogia quotidiana e chiudi con 3 domande di verifica."],
      ["Revisione del codice", "Programmazione", "Rivedi questo codice {{linguaggio|Python}}. Segnala bug e problemi di sicurezza e prestazioni. Proponi correzioni con una breve motivazione.\n\n```\n{{codice}}\n```"],
      ["Debug di un errore", "Programmazione", "Ho un errore in {{tecnologia}}:\n\n{{messaggio di errore}}\n\nCodice:\n```\n{{codice}}\n```\n\nSpiega la causa e dai una soluzione passo passo."],
      ["Pro e contro", "Decisioni", "Sto valutando: {{decisione}}. Elenca pro, contro, costi nascosti e rischi. Poi fammi 3 domande che mi aiutino a decidere."],
      ["Piano passo passo", "Produttività", "Crea un piano per raggiungere: {{obiettivo}} in {{tempo|4 settimane}}. Dividilo per settimane con attività concrete e indicatori di avanzamento."],
      ["Traduci", "Lingue", "Traduci in {{lingua|inglese}} mantenendo tono e formattazione. Aggiungi una breve nota per i modi di dire.\n\n{{testo}}"],
      ["Brainstorming", "Creatività", "Proponi {{numero|10}} idee per {{argomento}}. Una frase ciascuna. Segna le 3 più originali."]
    ],
    nl: [
      ["Samenvatten", "Schrijven", "Vat de tekst hieronder samen in {{aantal|5}} punten. Behoud belangrijke cijfers en namen.\n\n{{tekst}}"],
      ["Corrigeren", "Schrijven", "Verbeter grammatica en stijl van de tekst hieronder. Behoud mijn toon ({{toon|informeel}}). Toon de verbeterde versie en daarna de belangrijkste wijzigingen.\n\n{{tekst}}"],
      ["E-mail aan…", "Schrijven", "Schrijf een korte e-mail aan {{ontvanger}} over: {{onderwerp}}. Toon: {{toon|beleefd, to the point}}. Maximaal 120 woorden."],
      ["Leg het uit als aan een kind", "Leren", "Leg {{onderwerp}} uit alsof ik 5 jaar ben. Gebruik één alledaagse vergelijking en sluit af met 3 controlevragen."],
      ["Codereview", "Programmeren", "Review deze {{taal|Python}}-code. Wijs bugs en beveiligings- en prestatieproblemen aan. Stel verbeteringen voor met een korte toelichting.\n\n```\n{{code}}\n```"],
      ["Fout debuggen", "Programmeren", "Ik heb een fout in {{technologie}}:\n\n{{foutmelding}}\n\nCode:\n```\n{{code}}\n```\n\nLeg de oorzaak uit en geef een oplossing stap voor stap."],
      ["Voor- en nadelen", "Beslissingen", "Ik overweeg: {{beslissing}}. Noem voordelen, nadelen, verborgen kosten en risico's. Stel me daarna 3 vragen die helpen beslissen."],
      ["Stappenplan", "Productiviteit", "Maak een plan om dit doel te halen: {{doel}} binnen {{termijn|4 weken}}. Verdeel per week met concrete taken en meetpunten."],
      ["Vertalen", "Talen", "Vertaal naar het {{taal|Engels}} en behoud toon en opmaak. Voeg bij uitdrukkingen een korte notitie toe.\n\n{{tekst}}"],
      ["Brainstormen", "Creativiteit", "Bedenk {{aantal|10}} ideeën voor {{onderwerp}}. Eén zin per idee. Markeer de 3 origineelste."]
    ],
    cs: [
      ["Shrnout", "Psaní", "Shrň text níže do {{počet|5}} bodů. Zachovej důležitá čísla a jména.\n\n{{text}}"],
      ["Opravit text", "Psaní", "Oprav gramatiku a styl textu níže. Zachovej můj tón ({{tón|neformální}}). Ukaž opravenou verzi a pak seznam hlavních změn.\n\n{{text}}"],
      ["E-mail pro…", "Psaní", "Napiš krátký e-mail pro {{příjemce}} ve věci: {{věc}}. Tón: {{tón|zdvořilý, věcný}}. Maximálně 120 slov."],
      ["Vysvětli jako dítěti", "Učení", "Vysvětli {{téma}}, jako by mi bylo 5 let. Použij jednu analogii z běžného života a zakonči 3 kontrolními otázkami."],
      ["Revize kódu", "Programování", "Zkontroluj tento kód v {{jazyk|Python}}. Uveď chyby a problémy s bezpečností a výkonem. Navrhni opravy se stručným zdůvodněním.\n\n```\n{{kód}}\n```"],
      ["Ladění chyby", "Programování", "Mám chybu v {{technologie}}:\n\n{{chybová hláška}}\n\nKód:\n```\n{{kód}}\n```\n\nVysvětli příčinu a dej řešení krok za krokem."],
      ["Pro a proti", "Rozhodování", "Zvažuji: {{rozhodnutí}}. Vypiš výhody, nevýhody, skryté náklady a rizika. Pak mi polož 3 otázky, které mi pomohou rozhodnout."],
      ["Plán krok za krokem", "Produktivita", "Vytvoř plán, jak dosáhnout cíle: {{cíl}} za {{doba|4 týdny}}. Rozděl ho po týdnech s konkrétními úkoly a ukazateli pokroku."],
      ["Přeložit", "Jazyky", "Přelož do jazyka {{jazyk|angličtina}}, zachovej tón a formátování. U idiomů přidej krátkou poznámku.\n\n{{text}}"],
      ["Brainstorming", "Kreativita", "Vymysli {{počet|10}} nápadů na {{téma}}. Každý jednou větou. Označ 3 nejoriginálnější."]
    ],
    uk: [
      ["Підсумувати", "Письмо", "Стисло виклади текст нижче у {{кількість|5}} пунктах. Збережи важливі числа й назви.\n\n{{текст}}"],
      ["Виправити текст", "Письмо", "Виправ граматику й стиль тексту нижче. Збережи мій тон ({{тон|невимушений}}). Покажи виправлену версію, а потім список основних змін.\n\n{{текст}}"],
      ["Лист до…", "Письмо", "Напиши короткий лист до {{адресат}} щодо: {{тема}}. Тон: {{тон|ввічливий, по суті}}. Не більше 120 слів."],
      ["Поясни як дитині", "Навчання", "Поясни {{тема}} так, ніби мені 5 років. Використай одну аналогію з повсякденного життя й заверши 3 запитаннями для перевірки."],
      ["Рев'ю коду", "Програмування", "Переглянь цей код на {{мова|Python}}. Вкажи помилки, проблеми безпеки й продуктивності. Запропонуй виправлення з коротким поясненням.\n\n```\n{{код}}\n```"],
      ["Налагодити помилку", "Програмування", "У мене помилка в {{технологія}}:\n\n{{повідомлення про помилку}}\n\nКод:\n```\n{{код}}\n```\n\nПоясни причину й дай покрокове рішення."],
      ["За і проти", "Рішення", "Я розглядаю: {{рішення}}. Перелічи переваги, недоліки, приховані витрати й ризики. Потім постав мені 3 запитання, що допоможуть вирішити."],
      ["Покроковий план", "Продуктивність", "Склади план досягнення мети: {{мета}} за {{термін|4 тижні}}. Розбий по тижнях із конкретними завданнями й показниками прогресу."],
      ["Перекласти", "Мови", "Переклади {{мова|англійською}}, зберігаючи тон і форматування. До ідіом додай коротку примітку.\n\n{{текст}}"],
      ["Мозковий штурм", "Креативність", "Запропонуй {{кількість|10}} ідей для {{тема}}. По одному реченню. Познач 3 найоригінальніші."]
    ],
    tr: [
      ["Özetle", "Yazı", "Aşağıdaki metni {{sayı|5}} maddede özetle. Önemli sayıları ve isimleri koru.\n\n{{metin}}"],
      ["Düzelt", "Yazı", "Aşağıdaki metindeki dil bilgisi ve üslup hatalarını düzelt. Tonumu koru ({{ton|samimi}}). Düzeltilmiş hâli, ardından başlıca değişikliklerin listesini göster.\n\n{{metin}}"],
      ["E-posta…", "Yazı", "{{alıcı}} kişisine şu konuda kısa bir e-posta yaz: {{konu}}. Ton: {{ton|kibar, net}}. En fazla 120 kelime."],
      ["Çocuğa anlatır gibi", "Öğrenme", "{{konu}} konusunu 5 yaşındaymışım gibi anlat. Gündelik hayattan bir benzetme kullan ve 3 kontrol sorusuyla bitir."],
      ["Kod incelemesi", "Programlama", "Bu {{dil|Python}} kodunu incele. Hataları, güvenlik ve performans sorunlarını belirt. Kısa gerekçeyle düzeltmeler öner.\n\n```\n{{kod}}\n```"],
      ["Hata ayıkla", "Programlama", "{{teknoloji}} içinde bir hatam var:\n\n{{hata mesajı}}\n\nKod:\n```\n{{kod}}\n```\n\nNedenini açıkla ve adım adım çözüm ver."],
      ["Artılar ve eksiler", "Kararlar", "Şunu düşünüyorum: {{karar}}. Artıları, eksileri, gizli maliyetleri ve riskleri listele. Sonra karar vermeme yardım edecek 3 soru sor."],
      ["Adım adım plan", "Verimlilik", "Şu hedefe ulaşmak için bir plan yap: {{hedef}}, süre: {{süre|4 hafta}}. Haftalara böl, somut görevler ve ilerleme ölçütleri ekle."],
      ["Çevir", "Diller", "{{dil|İngilizce}} diline çevir, tonu ve biçimi koru. Deyimler için kısa bir not ekle.\n\n{{metin}}"],
      ["Beyin fırtınası", "Yaratıcılık", "{{konu}} için {{sayı|10}} fikir bul. Her biri tek cümle. En özgün 3 tanesini işaretle."]
    ],
    ja: [
      ["要約", "文章", "以下の文章を {{個数|5}} 個の箇条書きで要約してください。重要な数字や名前は残してください。\n\n{{文章}}"],
      ["校正", "文章", "以下の文章の文法と文体を直してください。私のトーン（{{トーン|カジュアル}}）は保ってください。修正版を示し、そのあと主な変更点を一覧にしてください。\n\n{{文章}}"],
      ["メール作成", "文章", "{{宛先}} 宛てに、次の件について短いメールを書いてください: {{件名}}。トーン: {{トーン|丁寧で簡潔}}。最大 200 文字。"],
      ["子どもにもわかるように", "学習", "{{テーマ}} を 5 歳の子どもにもわかるように説明してください。身近なたとえを 1 つ使い、最後に確認の質問を 3 つ出してください。"],
      ["コードレビュー", "プログラミング", "この {{言語|Python}} のコードをレビューしてください。バグ、セキュリティやパフォーマンスの問題を指摘し、理由を添えて修正案を出してください。\n\n```\n{{コード}}\n```"],
      ["エラーのデバッグ", "プログラミング", "{{技術}} でエラーが出ています:\n\n{{エラーメッセージ}}\n\nコード:\n```\n{{コード}}\n```\n\n原因を説明し、手順を追って解決方法を示してください。"],
      ["メリットとデメリット", "意思決定", "{{検討事項}} を検討しています。メリット、デメリット、見えにくいコストとリスクを挙げ、最後に判断に役立つ質問を 3 つしてください。"],
      ["ステップごとの計画", "生産性", "{{目標}} を {{期間|4 週間}} で達成する計画を立ててください。週ごとに具体的なタスクと進捗の指標を示してください。"],
      ["翻訳", "言語", "{{言語|英語}} に翻訳してください。トーンと書式は保ち、慣用句には短い注釈を付けてください。\n\n{{文章}}"],
      ["ブレインストーミング", "創造", "{{テーマ}} のアイデアを {{個数|10}} 個出してください。各 1 文で、最も独創的な 3 つに印を付けてください。"]
    ],
    "zh-CN": [
      ["总结", "写作", "把下面的文字总结成 {{条数|5}} 条要点，保留重要的数字和名称。\n\n{{文本}}"],
      ["润色", "写作", "修改下面文字的语法和文风，保持我的语气（{{语气|轻松}}）。先给出修改后的版本，再列出主要改动。\n\n{{文本}}"],
      ["写邮件", "写作", "给 {{收件人}} 写一封简短的邮件，主题：{{主题}}。语气：{{语气|礼貌、简洁}}。不超过 200 字。"],
      ["像给孩子讲一样", "学习", "像给 5 岁孩子讲一样解释 {{主题}}。用一个生活中的比喻，最后出 3 个检验问题。"],
      ["代码审查", "编程", "审查这段 {{语言|Python}} 代码，指出错误以及安全和性能问题，并附简短理由给出修改建议。\n\n```\n{{代码}}\n```"],
      ["排查错误", "编程", "我在 {{技术}} 中遇到错误：\n\n{{错误信息}}\n\n代码：\n```\n{{代码}}\n```\n\n请解释原因，并给出分步解决方法。"],
      ["利弊分析", "决策", "我在考虑：{{决定}}。列出优点、缺点、隐藏成本和风险，然后问我 3 个有助于决定的问题。"],
      ["分步计划", "效率", "制定一个在 {{期限|4 周}} 内实现 {{目标}} 的计划，按周拆分，包含具体任务和进度指标。"],
      ["翻译", "语言", "翻译成 {{语言|英语}}，保留语气和格式，遇到习语加一句简短说明。\n\n{{文本}}"],
      ["头脑风暴", "创意", "为 {{主题}} 想出 {{条数|10}} 个点子，每个一句话，并标出最有创意的 3 个。"]
    ],
    ko: [
      ["요약", "글쓰기", "아래 글을 {{개수|5}}개의 요점으로 요약해 줘. 중요한 숫자와 이름은 유지해 줘.\n\n{{텍스트}}"],
      ["교정", "글쓰기", "아래 글의 문법과 문체를 고쳐 줘. 내 말투({{말투|편안한}})는 유지해 줘. 고친 글을 보여 주고, 이어서 주요 수정 사항을 정리해 줘.\n\n{{텍스트}}"],
      ["이메일 작성", "글쓰기", "{{받는 사람}}에게 다음 주제로 짧은 이메일을 써 줘: {{주제}}. 말투: {{말투|정중하고 간결하게}}. 최대 200자."],
      ["아이에게 설명하듯", "학습", "{{주제}}를 다섯 살 아이에게 설명하듯 알려 줘. 일상적인 비유를 하나 들고, 마지막에 확인 질문 3개를 내 줘."],
      ["코드 리뷰", "프로그래밍", "이 {{언어|Python}} 코드를 리뷰해 줘. 버그, 보안 및 성능 문제를 짚고, 간단한 이유와 함께 수정 방법을 제안해 줘.\n\n```\n{{코드}}\n```"],
      ["오류 디버깅", "프로그래밍", "{{기술}}에서 오류가 발생했어:\n\n{{오류 메시지}}\n\n코드:\n```\n{{코드}}\n```\n\n원인을 설명하고 단계별 해결 방법을 알려 줘."],
      ["장단점", "의사결정", "{{결정}}을 고민 중이야. 장점, 단점, 숨은 비용과 위험을 정리하고, 결정에 도움이 될 질문 3개를 해 줘."],
      ["단계별 계획", "생산성", "{{목표}}를 {{기간|4주}} 안에 이루기 위한 계획을 세워 줘. 주 단위로 나누고 구체적인 할 일과 진행 지표를 넣어 줘."],
      ["번역", "언어", "{{언어|영어}}로 번역해 줘. 말투와 서식은 유지하고, 관용구에는 짧은 메모를 달아 줘.\n\n{{텍스트}}"],
      ["브레인스토밍", "창의성", "{{주제}}에 대한 아이디어 {{개수|10}}개를 내 줘. 각각 한 문장으로, 가장 독창적인 3개를 표시해 줘."]
    ]
  };

  const VAR_RE = /\{\{\s*([^{}|]+?)\s*(?:\|\s*([^{}]*?)\s*)?\}\}/g;

  const normTags = v => [...new Set((Array.isArray(v) ? v : String(v || "").split(/[,#;]+/)).map(x => String(x).trim().toLowerCase()).filter(Boolean))].slice(0, 12);

  const P = CK.prompts = {
    list: () => CK.store.data.prompts || [],
    normTags,
    tags() { const m = new Map(); for (const p of P.list()) for (const g of p.tags || []) m.set(g, (m.get(g) || 0) + 1); return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); },
    // Kolejność: ulubione zawsze na górze, potem wg wybranego sortowania (manual = kolejność w tablicy).
    sorted(list, sort = "manual") {
      const idx = new Map(P.list().map((p, i) => [p.id, i]));
      const cmp = {
        manual: (a, b) => idx.get(a.id) - idx.get(b.id),
        uses: (a, b) => (b.uses || 0) - (a.uses || 0) || idx.get(a.id) - idx.get(b.id),
        az: (a, b) => String(a.title).localeCompare(String(b.title), CK.locale),
        new: (a, b) => (b.added || 0) - (a.added || 0)
      }[sort] || ((a, b) => 0);
      return [...list].sort((a, b) => (!!b.fav - !!a.fav) || cmp(a, b));
    },
    async toggleFav(id) { const p = P.list().find(x => x.id === id); if (!p) return; p.fav = !p.fav; await CK.store.save("prompts"); },
    // Przenosi prompt `id` przed `beforeId` (albo na koniec, gdy beforeId = null).
    async move(id, beforeId) {
      const arr = P.list(), from = arr.findIndex(x => x.id === id);
      if (from < 0 || id === beforeId) return;
      const [it] = arr.splice(from, 1);
      const to = beforeId ? arr.findIndex(x => x.id === beforeId) : -1;
      if (to < 0) arr.push(it); else arr.splice(to, 0, it);
      await CK.store.save("prompts");
    },
    starter(lang) {
      const l = STARTER[lang] ? lang : "en";
      return STARTER[l].map(([title, cat, text], i) => ({ id: CK.uid("p"), title, cat, text, uses: 0, added: Date.now(), starter: l, sidx: i }));
    },
    // Niezmienione prompty z pakietu startowego idą za językiem wtyczki (zmiana języka = przetłumaczony pakiet).
    // Rozpoznajemy je po dokładnej treści — też te dodane przed 1.3.0. Zmienione przez użytkownika zostają bez zmian.
    async retranslate(lang = CK.lang) {
      const to = STARTER[lang] ? lang : "en";
      const find = p => {
        if (p.starter && STARTER[p.starter] && STARTER[p.starter][p.sidx]) return [p.starter, p.sidx];
        for (const [l, arr] of Object.entries(STARTER)) { const i = arr.findIndex(x => x[0] === p.title && x[2] === p.text); if (i >= 0) return [l, i]; }
        return null;
      };
      let n = 0;
      for (const p of P.list()) {
        const f = find(p); if (!f) continue;
        const [from, i] = f, orig = STARTER[from][i];
        if (p.title !== orig[0] || p.text !== orig[2]) continue; // użytkownik coś zmienił — nie ruszamy
        if (from === to) { if (!p.starter) { p.starter = to; p.sidx = i; n++; } continue; }
        const [title, cat, text] = STARTER[to][i];
        Object.assign(p, { title, text, starter: to, sidx: i, cat: p.cat === orig[1] ? cat : p.cat });
        n++;
      }
      if (n) await CK.store.save("prompts");
      return n;
    },
    vars(text) {
      const out = new Map();
      for (const m of String(text).matchAll(VAR_RE)) if (!out.has(m[1])) out.set(m[1], m[2] || "");
      return [...out].map(([name, def]) => ({ name, def }));
    },
    fill(text, values) { return String(text).replace(VAR_RE, (_, n, d) => values[n] ?? d ?? ""); },
    async save(p) {
      const arr = CK.store.data.prompts || (CK.store.data.prompts = []);
      const i = arr.findIndex(x => x.id === p.id);
      if (i >= 0) arr[i] = { ...arr[i], ...p }; else arr.unshift({ id: CK.uid("p"), uses: 0, added: Date.now(), ...p });
      await CK.store.save("prompts");
    },
    async remove(id) { CK.store.data.prompts = P.list().filter(x => x.id !== id); await CK.store.save("prompts"); },
    async addFromText(text) {
      const title = String(text).trim().split("\n")[0].slice(0, 60) || t("pr.untitled");
      await P.save({ title, cat: t("pr.catSaved"), text });
      CK.ui && CK.ui.setMsg(t("pr.savedMsg"));
    },
    // Uzupełnia zmienne (okno) i wstawia do pola czatu.
    async use(p) {
      const ui = CK.ui;
      let text = p.text;
      const vars = P.vars(text);
      if (vars.length) {
        const inputs = {};
        const values = await ui.modal(t("pr.fillTitle", { title: p.title }), () => ui.el("div", { class: "form" },
          vars.map(v => ui.el("label", {}, v.name,
            inputs[v.name] = v.name.length > 14 || /tekst|text|texte|code|kod/i.test(v.name)
              ? ui.el("textarea", { rows: 4, value: v.def })
              : ui.el("input", { type: "text", value: v.def })))),
          [{ label: t("ui.cancel"), result: null }, { label: t("pr.insert"), cls: "primary", value: () => Object.fromEntries(Object.entries(inputs).map(([k, i]) => [k, i.value])) }]);
        if (!values) return false;
        text = P.fill(text, values);
      }
      const ok = CK.dom.insertIntoComposer(text);
      if (!ok) { await ui.copy(text, t("pr.copiedNoComposer")); return false; }
      p.uses = (p.uses || 0) + 1;
      await CK.store.save("prompts");
      return true;
    },
    async edit(p = {}) {
      const ui = CK.ui;
      const cats = [...new Set(P.list().map(x => x.cat).filter(Boolean))];
      const f = {
        title: ui.el("input", { type: "text", value: p.title || "" }),
        cat: ui.el("input", { type: "text", value: p.cat || "", list: "ck-cats" }),
        tags: ui.el("input", { type: "text", value: (p.tags || []).join(", "), placeholder: t("pr.tagsPh") }),
        fav: ui.el("input", { type: "checkbox", checked: !!p.fav }),
        text: ui.el("textarea", { rows: 10, value: p.text || "" })
      };
      const res = await ui.modal(p.id ? t("pr.edit") : t("pr.new"), () => ui.el("div", { class: "form" },
        ui.el("label", {}, t("pr.fTitle"), f.title),
        ui.el("label", {}, t("pr.fCat"), f.cat, ui.el("datalist", { id: "ck-cats" }, cats.map(c => ui.el("option", { value: c })))),
        ui.el("label", {}, t("pr.fTags"), f.tags),
        ui.el("label", { class: "chk", style: "display:flex;gap:6px;align-items:center" }, f.fav, "⭐ " + t("pr.fFav")),
        ui.el("label", {}, t("pr.fText"), f.text),
        ui.el("p", { class: "muted" }, t("pr.varsHint"))),
        [{ label: t("ui.cancel"), result: null }, { label: t("ui.save"), cls: "primary", value: () => (f.text.value.trim() ? { title: f.title.value.trim() || f.text.value.trim().slice(0, 50), cat: f.cat.value.trim(), tags: normTags(f.tags.value), fav: f.fav.checked, text: f.text.value } : false) }]);
      if (res) await P.save({ ...p, ...res });
    },
    // Szybki wybór promptu (bez otwierania panelu).
    async picker() {
      const ui = CK.ui;
      const items = P.sorted(P.list(), "uses");
      let chosen = null;
      const listBox = ui.el("div", { style: "max-height:50vh;overflow:auto;margin-top:8px" });
      const q = ui.el("input", { type: "search", placeholder: t("pr.search"), style: "width:100%" });
      const draw = () => {
        const s = q.value.trim().toLowerCase();
        const vis = items.filter(p => !s || (p.title + " " + p.cat + " " + (p.tags || []).join(" ") + " " + p.text).toLowerCase().includes(s));
        listBox.replaceChildren(...vis.slice(0, 50).map(p => ui.el("div", { class: "card", style: "cursor:pointer", onclick: () => { chosen = p; closeFn(true); } },
          ui.el("div", { class: "h" }, ui.el("b", {}, (p.fav ? "⭐ " : "") + p.title), p.cat ? ui.el("span", { class: "badge" }, p.cat) : null),
          ui.el("div", { class: "body" }, p.text.slice(0, 160)))));
        if (!vis.length) listBox.append(ui.el("p", { class: "muted" }, t("pr.none")));
        return vis;
      };
      let closeFn;
      q.addEventListener("input", draw);
      q.addEventListener("keydown", e => { if (e.key === "Enter") { const v = draw(); if (v[0]) { chosen = v[0]; closeFn(true); } } });
      await ui.modal(t("pr.pickTitle"), close => { closeFn = close; draw(); return ui.el("div", {}, q, listBox); }, [{ label: t("ui.cancel"), result: null }]);
      if (chosen) await P.use(chosen);
    },
    exportJson() {
      CK.download(`chatkit-prompts-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: "ChatKit Pro", type: "prompts", prompts: P.list() }, null, 2), "application/json");
    },
    async importJson(file) {
      const j = JSON.parse(await file.text());
      const arr = Array.isArray(j) ? j : j.prompts;
      if (!Array.isArray(arr)) throw new Error("prompts[]");
      const have = new Set(P.list().map(p => p.title + "\u0000" + p.text));
      let n = 0;
      for (const p of arr) {
        if (!p || !p.text || have.has(p.title + "\u0000" + p.text)) continue;
        CK.store.data.prompts = CK.store.data.prompts || [];
        CK.store.data.prompts.push({ id: CK.uid("p"), title: p.title || p.text.slice(0, 50), cat: p.cat || "", tags: normTags(p.tags), fav: !!p.fav, text: p.text, uses: 0, added: Date.now() });
        n++;
      }
      await CK.store.save("prompts");
      return n;
    }
  };

  // ---------- zakładka w panelu ----------
  const state = { q: "", cat: "", tag: "", sort: null };
  function render(box, ui) {
    const { el, button, select } = ui;
    const all = P.list();
    if (!state.sort) { try { state.sort = localStorage.getItem("ckp.prsort") || "manual"; } catch { state.sort = "manual"; } }
    const cats = [...new Set(all.map(p => p.cat).filter(Boolean))].sort();
    const fileIn = el("input", { type: "file", accept: ".json", style: "display:none", onchange: async e => {
      try { const n = await P.importJson(e.target.files[0]); ui.setMsg(t("pr.imported", { n })); } catch (err) { ui.setMsg(t("msg.badFile", { e: err.message })); }
    } });
    const q = el("input", { type: "search", placeholder: t("pr.search"), value: state.q });
    const listBox = el("div"), tagBar = el("div", { class: "tagbar" });
    let dragId = null;
    const card = p => {
      const vars = P.vars(p.text);
      const c = el("div", { class: "card pr" + (p.fav ? " favd" : ""), "data-id": p.id },
        el("div", { class: "h" },
          el("span", { class: "drag", title: t("pr.dragTip"), draggable: "true" }, "⋮⋮"),
          el("span", { class: "fav" + (p.fav ? " on" : ""), title: t("pr.favTip"), onclick: () => P.toggleFav(p.id) }, p.fav ? "★" : "☆"),
          el("b", {}, p.title), p.cat ? el("span", { class: "badge" }, p.cat) : null,
          vars.length ? el("span", { class: "badge", title: vars.map(v => v.name).join(", ") }, "{{" + vars.length + "}}") : null,
          el("span", { class: "muted" }, "×" + (p.uses || 0)),
          button("▶ " + t("pr.insert"), () => P.use(p), { class: "primary" }),
          el("span", { class: "ic", title: t("ui.copy"), onclick: () => ui.copy(p.text) }, "⧉"),
          el("span", { class: "ic", title: t("pr.edit"), onclick: () => P.edit(p) }, "✎"),
          el("span", { class: "ic", title: t("ui.delete"), onclick: async () => { if (confirm(t("pr.confirmDelete", { title: p.title }))) await P.remove(p.id); } }, "✕")),
        (p.tags || []).length ? el("div", { class: "tags" }, p.tags.map(g => el("span", { class: "tag" + (state.tag === g ? " on" : ""), onclick: () => { state.tag = state.tag === g ? "" : g; draw(); } }, "#" + g))) : null,
        el("div", { class: "body" }, p.text));
      // przeciąganie (uchwyt ⋮⋮) — zmienia kolejność „Moja kolejność”
      const h = c.querySelector(".drag");
      h.addEventListener("dragstart", e => { dragId = p.id; c.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", p.id); } catch {} });
      h.addEventListener("dragend", () => { dragId = null; c.classList.remove("dragging"); listBox.querySelectorAll(".over").forEach(x => x.classList.remove("over")); });
      c.addEventListener("dragover", e => { if (!dragId || dragId === p.id) return; e.preventDefault(); c.classList.add("over"); });
      c.addEventListener("dragleave", () => c.classList.remove("over"));
      c.addEventListener("drop", async e => {
        e.preventDefault(); c.classList.remove("over");
        const id = dragId; dragId = null;
        if (!id || id === p.id) return;
        if (state.sort !== "manual") { state.sort = "manual"; try { localStorage.setItem("ckp.prsort", "manual"); } catch {} }
        await P.move(id, p.id);
        ui.setMsg(t("pr.moved"));
      });
      return c;
    };
    const draw = () => {
      const s = state.q.trim().toLowerCase();
      const vis = P.sorted(all.filter(p => (!state.cat || p.cat === state.cat) && (!state.tag || (p.tags || []).includes(state.tag)) &&
        (!s || (p.title + " " + (p.tags || []).join(" ") + " " + p.text).toLowerCase().includes(s))), state.sort);
      listBox.replaceChildren(...vis.map(card));
      if (!vis.length) listBox.append(el("div", { class: "empty" }, all.length ? t("ui.noResults") : t("pr.empty")));
      const tags = P.tags();
      tagBar.replaceChildren();
      if (tags.length) tagBar.append(el("span", { class: "muted" }, t("pr.tags") + ":"),
        ...tags.map(([g, n]) => el("span", { class: "tag" + (state.tag === g ? " on" : ""), onclick: () => { state.tag = state.tag === g ? "" : g; draw(); } }, "#" + g + " " + n)),
        state.tag ? el("span", { class: "ic", title: t("pr.clearTag"), onclick: () => { state.tag = ""; draw(); } }, "✕") : null);
    };
    q.addEventListener("input", e => { state.q = e.target.value; draw(); });
    box.append(el("div", { class: "pane" },
      el("div", { class: "rowb", style: "margin:0 0 10px" }, q,
        select([["", t("pr.allCats")], ...cats.map(c => [c, c])], state.cat, v => { state.cat = v; draw(); }),
        select([["manual", t("pr.sortManual")], ["uses", t("pr.sortUses")], ["az", t("pr.sortAz")], ["new", t("pr.sortNew")]], state.sort,
          v => { state.sort = v; try { localStorage.setItem("ckp.prsort", v); } catch {} draw(); }),
        button("＋ " + t("pr.new"), () => P.edit(), { class: "primary" })),
      tagBar,
      el("p", { class: "muted", style: "margin:0 0 10px" }, t("pr.howTo") + " " + t("pr.howTo2")),
      listBox,
      el("div", { class: "rowb", style: "margin-top:12px" },
        button("⬇ " + t("pr.export"), () => P.exportJson()), button("⬆ " + t("pr.import"), () => fileIn.click()), fileIn,
        button(t("pr.addStarter"), async () => {
          const have = new Set(P.list().map(p => p.title));
          const add = P.starter(CK.lang).filter(p => !have.has(p.title));
          CK.store.data.prompts = [...P.list(), ...add]; await CK.store.save("prompts"); ui.setMsg(t("pr.imported", { n: add.length }));
        }))));
    draw();
  }

  CK.ready.then(() => {
    if (!Array.isArray(CK.store.data.prompts)) { CK.store.data.prompts = P.starter(CK.lang); CK.store.save("prompts"); }
    // pakiet startowy w języku wtyczki — także po zmianie języka w ⚙
    let promptLang = null;
    const follow = () => { if (CK.lang !== promptLang) { promptLang = CK.lang; P.retranslate(CK.lang).catch(() => {}); } };
    follow(); CK.store.onChange(follow);
    CK.ui.registerTab({ id: "prompts", label: () => t("tab.prompts"), render });

    // Alt+Shift+P — szybki wybór promptu
    document.addEventListener("keydown", e => {
      if (CK.on() && e.altKey && e.shiftKey && e.code === "KeyP") { e.preventDefault(); P.picker(); }
    }, true);
    // "//" w pustym polu wiadomości — szybki wybór
    document.addEventListener("input", e => {
      if (!CK.on()) return;
      const c = CK.dom.composer();
      if (!c || !(e.target === c || c.contains(e.target))) return;
      if (CK.dom.composerText().trim() === "//") { CK.dom.insertIntoComposer("", true); P.picker(); }
    }, true);
  });
})();
