import type { DocumentData } from '@/lib/documents/templates'

/**
 * One A4 sheet in the layout of an official letter in Kazakhstan: a bilingual
 * letterhead (Kazakh left, Russian right, mark in the middle) over a double
 * rule, the outgoing number and date, the addressee on the right, a subject
 * line, the text, and the signature block — position, signature, full name.
 *
 * Sizes are in millimetres and points so the screen preview and the printed
 * page match. Margins follow the usual 30 / 15 / 20 / 20 mm.
 */

function formatDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? `${match[3]}.${match[2]}.${match[1]}` : ''
}

function Lines({ count }: { count: number }) {
  return (
    <div aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} style={{ height: '9.5mm', borderBottom: '0.3mm solid #111' }} />
      ))}
    </div>
  )
}

export function DocumentSheet({ data, number }: { data: DocumentData; number: string | null }) {
  const paragraphs = data.body.split(/\n{2,}|\n/).map((line) => line.trim()).filter(Boolean)
  const blank = (width: string) => <span style={{ display: 'inline-block', width, borderBottom: '0.3mm solid #111' }}>&nbsp;</span>

  return (
    <article className="doc-sheet" lang="ru">
      <header className="print-keep" style={{ display: 'grid', gridTemplateColumns: '1fr 22mm 1fr', alignItems: 'start', gap: '4mm' }}>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '11pt', lineHeight: 1.25 }}>
          {data.orgKk || '«OlympAI» жобасы'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- printed as-is */}
          <img src="/icon.svg" alt="" style={{ width: '16mm', height: '16mm' }} />
        </div>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '11pt', lineHeight: 1.25 }}>
          {data.orgRu || 'Проект «OlympAI»'}
        </div>
      </header>
      {data.requisites ? (
        <p style={{ marginTop: '2mm', textAlign: 'center', fontSize: '9pt', lineHeight: 1.3, whiteSpace: 'pre-line' }}>{data.requisites}</p>
      ) : null}
      <div style={{ marginTop: '2.5mm', borderTop: '0.8mm solid #111', paddingTop: '0.6mm' }}>
        <div style={{ borderTop: '0.25mm solid #111' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6mm', marginTop: '6mm', fontSize: '12pt' }}>
        <div>
          {data.date ? formatDate(data.date) : blank('30mm')} {'№ '}
          {number ?? blank('32mm')}
        </div>
        <div>{data.city ? `${data.city} қ. / г. ${data.city}` : null}</div>
      </div>

      {data.recipient ? (
        <div style={{ marginTop: '8mm', marginLeft: '50%', whiteSpace: 'pre-line', fontWeight: 700, lineHeight: 1.3 }}>{data.recipient}</div>
      ) : null}

      <h1 style={{ marginTop: '10mm', textAlign: 'center', fontSize: '14pt', fontWeight: 700, letterSpacing: '0.04em' }}>
        РЕСМИ ПІКІР / ОФИЦИАЛЬНЫЙ ОТЗЫВ
      </h1>
      {data.subject ? <p style={{ marginTop: '4mm', fontWeight: 700, maxWidth: '100mm', lineHeight: 1.25 }}>{data.subject}</p> : null}

      <div style={{ marginTop: '6mm' }}>
        {paragraphs.length ? (
          paragraphs.map((text, index) => (
            <p key={index} style={{ textIndent: '12.5mm', textAlign: 'justify', lineHeight: 1.5, marginBottom: '1mm' }}>
              {text}
            </p>
          ))
        ) : (
          <Lines count={14} />
        )}
      </div>

      <footer className="doc-signature" style={{ marginTop: '18mm', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', alignItems: 'end', gap: '6mm' }}>
        <div style={{ fontWeight: 700, lineHeight: 1.25 }}>{data.position || blank('100%')}</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderBottom: '0.3mm solid #111', height: '10mm' }} />
          <div style={{ fontSize: '9pt', marginTop: '1mm' }}>қолы / подпись</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ borderBottom: '0.3mm solid #111', minHeight: '10mm', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontWeight: 700 }}>
            {data.signer}
          </div>
          <div style={{ fontSize: '9pt', marginTop: '1mm' }}>Т.А.Ә. / Ф.И.О.</div>
        </div>
      </footer>
      <p style={{ marginTop: '6mm', fontSize: '10pt' }}>М.О. / М.П.</p>
    </article>
  )
}
