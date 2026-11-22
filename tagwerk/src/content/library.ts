export interface Article {
  slug: string;
  title: string;
  teaser: string;
  minutes: number;
  /** Markdown-light: paragraphs separated by blank lines, "## " headings, "- " bullets. */
  body: string;
  sources: string;
}

export const ARTICLES: Article[] = [
  {
    slug: 'was-ist-schlafschuld',
    title: 'Was ist Schlafschuld?',
    teaser: 'Warum sich kurze Nächte aufsummieren und was dagegen hilft.',
    minutes: 4,
    body: `Stell dir vor, dein Körper führt ein Schlafkonto. Jeder Mensch hat einen persönlichen Schlafbedarf, bei den meisten Erwachsenen zwischen sieben und neun Stunden. Schläfst du weniger, entsteht ein Minus. Dieses Minus nennen wir Schlafschuld.

## Wie sie entsteht

Eine Nacht mit sechs statt acht Stunden fühlt sich oft noch machbar an. Das Problem: Die fehlenden zwei Stunden verschwinden nicht. Wiederholst du das fünf Nächte lang, hast du am Ende deutlich mehr als eine Nacht Schlaf angespart, die du nicht hattest. Genau das zeigt Tagwerk als Schlafschuld.

## Warum neuere Nächte mehr zählen

Tagwerk schaut auf die letzten 14 Nächte. Die letzte Nacht zählt am stärksten, eine Nacht vor zwei Wochen nur noch gering. So bildet die Zahl ab, wie du dich heute fühlst, und nicht, wie du dich im letzten Monat gefühlt hast.

## Was dagegen hilft

- Geh an mehreren Abenden 20 bis 40 Minuten früher ins Bett.
- Halte deine Aufstehzeit stabil, damit die innere Uhr nicht aus dem Takt kommt.
- Nimm bei Bedarf einen kurzen Nap am frühen Nachmittag.
- Mehr Schlaf als nötig baut Schuld nur halb so schnell ab, ein einzelner Marathon-Schlaf wirkt also weniger als regelmäßige Nächte.

## Wie viel ist okay?

Unter fünf Stunden Schuld gilt als niedrig. Zwischen fünf und zehn Stunden merkst du es meist deutlich. Darüber leiden Konzentration, Stimmung und Reaktionsvermögen spürbar. Wenn du trotz genug Schlaf dauerhaft erschöpft bist, sprich mit einer Ärztin oder einem Arzt.`,
    sources:
      'Allgemeine Forschungsgrundlagen: Zwei-Prozess-Modell (Borbély, 1982); kumulative Effekte von Schlafmangel (Van Dongen et al., 2003).',
  },
  {
    slug: 'wie-die-innere-uhr-funktioniert',
    title: 'Wie die innere Uhr funktioniert',
    teaser: 'Zwei Systeme steuern, wann du wach und wann du müde bist.',
    minutes: 4,
    body: `Dein Wachsein wird von zwei Systemen gesteuert, die zusammenspielen.

## System 1: der Schlafdruck

Je länger du wach bist, desto mehr Schlafdruck baut sich auf, ein bisschen wie Wasser in einem Gefäß. Schläfst du, läuft das Gefäß wieder leer. Nach einer kurzen Nacht startest du mit mehr Druck in den Tag.

## System 2: die innere Uhr

Ein Taktgeber im Gehirn folgt einem Rhythmus von etwa 24 Stunden. Er sorgt dafür, dass du am Morgen Fahrt aufnimmst, am Nachmittag ein Tief hast und am frühen Abend noch einmal wach wirst. Kurz danach steigt Melatonin und bereitet den Schlaf vor.

## Warum es mittags ein Tief gibt

Schlafdruck und innere Uhr addieren sich nicht gleichmäßig. Am Nachmittag ist der Druck schon deutlich gestiegen, während die Uhr noch keinen Schub liefert. Das Ergebnis ist das bekannte Nachmittagstief, unabhängig davon, was du gegessen hast.

## Was die innere Uhr beeinflusst

- Licht, vor allem am Morgen, ist der stärkste Taktgeber.
- Regelmäßige Zeiten für Schlaf, Essen und Bewegung.
- Spätes helles Licht verschiebt die Uhr nach hinten.

Tagwerk berechnet beide Systeme und zeigt dir daraus deine Energiekurve für den Tag.`,
    sources: 'Allgemeine Forschungsgrundlagen: Zwei-Prozess-Modell (Borbély, 1982); Timing of human sleep (Daan, Beersma & Borbély, 1984).',
  },
  {
    slug: 'chronotypen',
    title: 'Chronotypen: Lerche, Taube, Eule',
    teaser: 'Warum manche früh fit sind und andere erst abends.',
    minutes: 3,
    body: `Menschen unterscheiden sich darin, wann ihre innere Uhr den Tag beginnen lässt. Das nennt man Chronotyp. Er ist zum Teil erblich und ändert sich mit dem Alter: Jugendliche werden später, ältere Menschen wieder früher.

## Wie man ihn bestimmt

Ein guter Hinweis ist die Mitte deines Schlafs an freien Tagen, wenn du ohne Wecker schläfst. Liegt sie vor drei Uhr, bist du eher ein Frühtyp. Zwischen drei und fünf Uhr liegt die Mitte. Nach fünf Uhr bist du ein Spättyp. Hast du unter der Woche Schlaf aufgeholt, rechnen wir das heraus.

## Kein richtig oder falsch

Ein später Chronotyp ist keine Faulheit. Deine Energiehochs, dein Melatonin und deine ideale Schlafenszeit liegen einfach später. Tagwerk verschiebt deshalb die ganze Kurve mit. Schwierig wird es erst, wenn der Alltag früh startet und die Uhr spät läuft.

## Was Spättypen helfen kann

- Morgenlicht, so früh es geht.
- Abends gedimmtes Licht und weniger Bildschirmzeit.
- Aufstehzeit schrittweise vorziehen, etwa 15 Minuten alle paar Tage.`,
    sources: 'Allgemeine Forschungsgrundlagen: Chronotyp, Mitte des Schlafs an freien Tagen (Roenneberg et al.).',
  },
  {
    slug: 'schlaftraegheit',
    title: 'Schlafträgheit: Warum du morgens neben dir stehst',
    teaser: 'Die Benommenheit nach dem Aufwachen ist normal und hat Gründe.',
    minutes: 3,
    body: `Kurz nach dem Aufwachen bist du noch nicht ganz da: Denken fällt schwer, Bewegungen sind träge. Dieser Zustand heißt Schlafträgheit und dauert meist 30 bis 90 Minuten.

## Wovon sie abhängt

- Wie viel Schlaf dir fehlt: Mit hoher Schlafschuld ist die Trägheit stärker und dauert länger.
- Wann du aufwachst: Nahe am Tiefpunkt deiner inneren Uhr, also sehr früh, ist sie besonders ausgeprägt.
- In welcher Schlafphase du geweckt wirst: Aus dem Tiefschlaf gerissen zu werden fühlt sich am schlimmsten an.

## Was hilft

- Gehe in der ersten Stunde ans Tageslicht.
- Trink ein Glas Wasser und beweg dich ein paar Minuten.
- Plane in der ersten Stunde keine schwierigen Entscheidungen.
- Ein Wecker, der in einer leichten Schlafphase klingelt, kann helfen. Ein Spielraum von 30 Minuten ist oft besser als eine feste Minute.

Tagwerk zeigt dir auf der Energiekurve, wie lange deine Benommenheit voraussichtlich dauert.`,
    sources: 'Allgemeine Forschungsgrundlagen: Schlafträgheit (Tassi & Muzet, 2000).',
  },
  {
    slug: 'koffein-und-halbwertszeit',
    title: 'Koffein und seine Halbwertszeit',
    teaser: 'Warum der Kaffee um 16 Uhr noch um Mitternacht wirkt.',
    minutes: 3,
    body: `Koffein macht wach, weil es die Wirkung des Schlafdrucks im Gehirn dämpft. Der Schlafdruck ist trotzdem da, du spürst ihn nur nicht.

## Die Halbwertszeit

Im Durchschnitt braucht der Körper etwa fünf bis sechs Stunden, um die Hälfte des Koffeins abzubauen. Das variiert stark: Rauchen beschleunigt den Abbau, die Pille, Schwangerschaft und manche Gene verlangsamen ihn. Ein Kaffee um 16 Uhr bedeutet also, dass um 22 Uhr noch ein halber im Blut ist.

## Der Koffein-Stopp

Tagwerk empfiehlt, ungefähr acht Stunden vor der Schlafenszeit auf Koffein zu verzichten. Du kannst den Wert in den Einstellungen ändern. Wer empfindlich ist, wählt zehn Stunden.

## Praktische Tipps

- Denk an versteckte Quellen: Cola, Energy-Drinks, Schwarztee, Matcha, Schokolade.
- Wenn du morgens sehr müde bist, trink den ersten Kaffee eine Stunde nach dem Aufstehen, nach dem Morgenlicht.
- Verschieb Koffein nicht ins Nachmittagstief, sondern gönn dir lieber einen kurzen Spaziergang.`,
    sources: 'Allgemeine Forschungsgrundlagen: Koffein-Pharmakokinetik und Schlafdruck (Adenosin-Rezeptoren).',
  },
  {
    slug: 'licht-am-morgen',
    title: 'Licht am Morgen',
    teaser: 'Der einfachste Hebel für Wachheit und besseren Schlaf.',
    minutes: 3,
    body: `Deine innere Uhr wird vor allem durch Licht eingestellt. Besonders wirksam ist helles Licht in der ersten Stunde nach dem Aufwachen.

## Warum Draußen besser ist

Ein normal beleuchtetes Zimmer hat etwa 100 bis 500 Lux. Draußen sind es auch an einem grauen Tag mehrere Tausend, an einem sonnigen Tag über 50.000. Deine Augen und deine innere Uhr registrieren diesen Unterschied deutlich.

## Wie viel?

Zehn bis dreißig Minuten reichen meist. Bei bedecktem Himmel eher länger. Du musst nicht in die Sonne schauen, es genügt, draußen zu sein: beim Frühstück auf dem Balkon, auf dem Weg zur Arbeit oder bei einem kurzen Spaziergang.

## Was du davon hast

- Du wirst schneller klar im Kopf.
- Deine Uhr wird früher eingestellt, du wirst abends eher müde.
- Der Tag-Nacht-Kontrast wird größer, das stabilisiert den Schlaf.

Abends gilt das Gegenteil: Gedimmtes, warmes Licht lässt Melatonin steigen.`,
    sources: 'Allgemeine Forschungsgrundlagen: Lichtabhängige Phasenverschiebung der zirkadianen Uhr.',
  },
  {
    slug: 'powernaps-richtig',
    title: 'Powernaps richtig',
    teaser: 'Kurz, früh und mit Wecker: So hilft das Nickerchen.',
    minutes: 3,
    body: `Ein Nap kann Energie zurückbringen, wenn du ihn richtig machst.

## Die Regeln

- Kurz: höchstens 20 Minuten. Danach rutschst du in den Tiefschlaf und wachst benommen auf.
- Früh: Am besten im Nachmittagstief, spätestens sieben Stunden vor der Schlafenszeit. Ein später Nap nimmt dir den Schlafdruck für die Nacht.
- Mit Wecker: Stell dir einen Alarm, damit du nicht länger schläfst als geplant.

## Der lange Nap

Wenn du viel Schlafschuld hast oder nachts gearbeitet hast, kann ein Nap von 90 Minuten sinnvoll sein. Das ist ein voller Schlafzyklus, du wachst meist in einer leichten Phase auf. Plan dafür aber genug Zeit ein.

## Wenn du nicht einschlafen kannst

Das ist normal. Auch Ausruhen mit geschlossenen Augen hilft. Wenn Naps dein Einschlafen am Abend erschweren, lass sie weg oder kürze sie.

In Tagwerk siehst du den besten Zeitpunkt im Tagesplan, direkt im Nachmittagstief.`,
    sources: 'Allgemeine Forschungsgrundlagen: Tagesschlaf, Schlafdruck und Schlafträgheit (Tassi & Muzet, 2000).',
  },
  {
    slug: 'social-jetlag',
    title: 'Social Jetlag',
    teaser: 'Wenn das Wochenende deine innere Uhr verstellt.',
    minutes: 3,
    body: `Wer unter der Woche früh aufsteht und am Wochenende lange schläft, verschiebt jede Woche seine innere Uhr, als würde er nach Westen fliegen und am Montag wieder zurück. Das nennt man Social Jetlag.

## Woran du ihn erkennst

Der Unterschied zwischen der Mitte deines Schlafs an freien Tagen und an Arbeitstagen ist der Social Jetlag. Mehr als zwei Stunden gelten als deutlich. Typische Folgen sind Müdigkeit am Montag, schlechtes Einschlafen am Sonntagabend und mehr Schlafschuld.

## Was du tun kannst

- Steh am Wochenende höchstens eine Stunde später auf als sonst.
- Hol Schlaf lieber mit einem Nap oder einer etwas früheren Schlafenszeit auf.
- Geh morgens am Wochenende kurz ans Licht, auch wenn du länger schläfst.
- Verschieb deinen Rhythmus schrittweise, etwa 15 Minuten alle zwei bis drei Tage.

Spättypen haben es besonders schwer, weil frühe Termine gegen die innere Uhr laufen. Tagwerk zeigt dir den Wert unter „Dein Chronotyp“.`,
    sources: 'Allgemeine Forschungsgrundlagen: Social Jetlag (Roenneberg et al.).',
  },
  {
    slug: 'alkohol-und-schlaf',
    title: 'Alkohol und Schlaf',
    teaser: 'Schneller eingeschlafen, schlechter erholt.',
    minutes: 3,
    body: `Ein Glas Wein am Abend macht müde. Viele nutzen Alkohol deshalb als Einschlafhilfe. Für die Qualität des Schlafs ist das aber keine gute Idee.

## Was passiert

In der ersten Nachthälfte schläfst du oft tiefer. Wenn der Körper den Alkohol abbaut, wird der Schlaf in der zweiten Hälfte flacher, unruhiger und kürzer. Du wachst häufiger auf und die Traumschlafphasen werden unterdrückt.

## Was du merkst

- Du wachst früh auf und kannst nicht wieder einschlafen.
- Du fühlst dich trotz langer Nacht nicht erholt.
- Das Herz schlägt in der Nacht schneller, die Erholung ist geringer.

## Praktische Regeln

- Lass zwischen dem letzten Drink und der Schlafenszeit mindestens drei Stunden Abstand.
- Trink dazu Wasser.
- Nutze Alkohol nicht als Schlafmittel. Wenn du schlecht einschläfst, helfen eine Abendroutine und die Atemübung 4-7-8 besser.`,
    sources: 'Allgemeine Forschungsgrundlagen: Alkohol und Schlafarchitektur.',
  },
  {
    slug: 'einschlafen-wenns-nicht-klappt',
    title: 'Einschlafen, wenn’s nicht klappt',
    teaser: 'Was du tun kannst, wenn du im Bett wach liegst.',
    minutes: 4,
    body: `Jeder liegt manchmal wach. Wichtig ist, wie du damit umgehst, damit daraus kein Dauerproblem wird.

## Vor dem Schlafen

- Dimm eine Stunde vor der Schlafenszeit das Licht und leg Bildschirme weg.
- Mach etwas Ruhiges: lesen, dehnen, leise Musik, die Atemübung.
- Halte das Schlafzimmer kühl, dunkel und ruhig.

## Wenn du im Bett wach liegst

- Schau nicht auf die Uhr. Das erhöht den Druck.
- Wenn du länger als etwa 20 Minuten wach bist, steh auf, setz dich bei schwachem Licht hin und mach etwas Ruhiges. Geh erst zurück, wenn du müde bist.
- Schreib kreisende Gedanken auf einen Zettel. Was aufgeschrieben ist, muss nicht gemerkt werden.
- Probier die Atemübung 4-7-8: vier Sekunden einatmen, sieben halten, acht ausatmen.

## Was du vermeiden solltest

- Tagsüber lange schlafen, um Verlorenes aufzuholen.
- Alkohol und spätes Koffein.
- Im Bett arbeiten oder scrollen.

Wenn du mehrere Wochen lang schlecht schläfst und dich tagsüber stark beeinträchtigt fühlst, sprich mit einer Ärztin oder einem Arzt.`,
    sources: 'Allgemeine Forschungsgrundlagen: Schlafhygiene und kognitive Verhaltenstherapie bei Schlafstörungen (CBT-I).',
  },
  {
    slug: 'schichtarbeit',
    title: 'Schichtarbeit und wechselnde Zeiten',
    teaser: 'Wie du deine innere Uhr unterstützt, wenn nichts regelmäßig ist.',
    minutes: 4,
    body: `Wer nachts oder in wechselnden Schichten arbeitet, arbeitet gegen die innere Uhr. Perfekt wird das nie, aber du kannst es leichter machen.

## Wie schnell sich die Uhr anpasst

Die innere Uhr verschiebt sich pro Tag nur um etwa eine Stunde. Ein plötzlicher Wechsel von Früh- auf Nachtschicht lässt sich also nicht in einer Nacht ausgleichen. Tagwerk berücksichtigt das und zeigt dir an, wie lange deine Uhr noch zum Anpassen braucht.

## Tipps

- Nutze Licht gezielt: hell vor und während der Schicht, abends nach der Schicht Sonnenbrille und dunkles Schlafzimmer.
- Plane Schlaf in festen Blöcken und verdunkle das Zimmer.
- Ein Nap vor der Nachtschicht senkt die Müdigkeit.
- Koffein in der ersten Schichthälfte, nicht kurz vor dem Schlafengehen.
- Versuch, die Schlafzeit nach Schichtwechsel schrittweise zu verschieben.

## Im Schichtmodus

Schalte in den Einstellungen den Schichtmodus ein. Tagwerk richtet dann deinen Tagesplan an deinem tatsächlichen Schlaf der letzten Tage aus statt an der Uhrzeit.`,
    sources: 'Allgemeine Forschungsgrundlagen: Anpassungsrate der zirkadianen Uhr, Schichtarbeit und Schlaf.',
  },
  {
    slug: 'wochenende-ausschlafen',
    title: 'Wochenende ausschlafen: Hilft das?',
    teaser: 'Ein bisschen schon, aber nicht so, wie man denkt.',
    minutes: 3,
    body: `Der Wunsch ist verständlich: Unter der Woche zu kurz, am Wochenende nachholen. Funktioniert das?

## Was Ausschlafen kann

Eine lange Nacht baut Schlafschuld ab, aber nur zum Teil. In Tagwerk zählt Mehrschlaf nur halb so stark wie ein Defizit. Das spiegelt die Erfahrung wider, dass sich eine Woche kurzen Schlafs nicht in einer Nacht ausgleichen lässt.

## Der Preis

Wer sehr lange schläft, verschiebt seine innere Uhr nach hinten und bekommt am Sonntagabend Probleme beim Einschlafen. Der Montag beginnt dann schwer.

## Besser

- Steh am Wochenende höchstens ein bis zwei Stunden später auf.
- Ergänze mit einem Nap am Nachmittag, höchstens 20 bis 30 Minuten.
- Verteile das Aufholen: Geh jeden Abend 20 bis 30 Minuten früher ins Bett.
- Hol dir am Samstag und Sonntag trotzdem Morgenlicht.

Das Ziel ist nicht, die Schuld auf einmal loszuwerden, sondern sie gar nicht erst entstehen zu lassen.`,
    sources: 'Allgemeine Forschungsgrundlagen: Erholungsschlaf nach Schlafrestriktion, Social Jetlag.',
  },
  {
    slug: 'schlafzimmer-und-umgebung',
    title: 'Das Schlafzimmer als Schlafort',
    teaser: 'Temperatur, Licht und Geräusche in Reihenfolge ihrer Wirkung.',
    minutes: 3,
    body: `Dein Schlafzimmer entscheidet mit, wie schnell du einschläfst und wie gut du durchschläfst.

## Temperatur

Zum Einschlafen sinkt die Körpertemperatur. Ein kühler Raum, etwa 16 bis 19 Grad, unterstützt das. Eine zu warme Wohnung ist einer der häufigsten Gründe für unruhige Nächte im Sommer.

## Licht

Schon wenig Licht stört den Schlaf. Verdunkle den Raum so gut es geht, nutze eine Schlafmaske oder dicke Vorhänge und decke leuchtende Geräte ab. Für den Weg zur Toilette reicht ein schwaches, warmes Nachtlicht.

## Geräusche

Gleichmäßige Geräusche wie Rauschen oder Regen können Störgeräusche überdecken. Einige Menschen schlafen damit besser, andere lieber in Stille. Probier es aus. In Tagwerk findest du unter Tools verschiedene Geräusche mit Timer.

## Das Bett

Nutze das Bett nach Möglichkeit nur zum Schlafen. So lernt dein Gehirn, dass Bett und Schlaf zusammengehören.`,
    sources: 'Allgemeine Forschungsgrundlagen: Schlafumgebung, Thermoregulation und Schlaf.',
  },
];

export const ARTICLE_BY_SLUG: Record<string, Article> = Object.fromEntries(ARTICLES.map((a) => [a.slug, a]));

export type Block = { type: 'h' | 'p' | 'li'; text: string };

/** Parse the tiny markdown subset used by the articles. */
export function parseBody(body: string): Block[] {
  const out: Block[] = [];
  for (const chunk of body.split(/\n\s*\n/)) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    if (lines.every((l) => l.startsWith('- '))) {
      for (const l of lines) out.push({ type: 'li', text: l.slice(2) });
    } else if (lines[0].startsWith('## ')) {
      out.push({ type: 'h', text: lines[0].slice(3) });
      const rest = lines.slice(1);
      if (rest.length) out.push({ type: 'p', text: rest.join(' ') });
    } else {
      out.push({ type: 'p', text: lines.join(' ') });
    }
  }
  return out;
}
