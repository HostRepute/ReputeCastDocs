import { describe, expect, it } from 'vitest'
import { checkPageLinks, distFile, htmlIds, internalHrefs } from '../../scripts/content/links.ts'

describe('built-site links', () => {
  it('collects internal hrefs and ids, decoding entities', () => {
    const html =
      '<a href="/a/b/#x">x</a><a href="https://example.com/">e</a><a class="c" href="#top">t</a>' +
      '<a href="//cdn.example.com/">c</a><h2 id="q&amp;a">Q</h2>'
    expect(internalHrefs(html)).toEqual(['/a/b/#x', '#top'])
    expect([...htmlIds(html)]).toEqual(['q&a'])
  })

  it('maps URL paths to dist files', () => {
    expect(distFile('/')).toBe('index.html')
    expect(distFile('/reference/cli/')).toBe('reference/cli/index.html')
    expect(distFile('/og/index.png')).toBe('og/index.png')
    expect(distFile('/reference/cli')).toBeUndefined()
  })

  it('reports missing pages, missing anchors and missing trailing slashes', () => {
    const files: Record<string, string> = {
      'reference/glossary/index.html': '<dt id="send-readiness">Send Readiness</dt>',
      'page/index.html': '<h2 id="local">L</h2>',
    }
    const html =
      '<a href="/reference/glossary/#send-readiness">ok</a><a href="/reference/glossary/#nope">x</a>' +
      '<a href="/gone/">x</a><a href="/reference/glossary">x</a><a href="#local">ok</a><a href="#_top">ok</a>'
    const problems = checkPageLinks(
      'page/index.html',
      html,
      (f) => f in files,
      (f) => htmlIds(files[f]),
    ).map((p) => `${p.href}: ${p.problem}`)
    expect(problems).toEqual([
      '/reference/glossary/#nope: no element with id "nope"',
      '/gone/: no such page',
      '/reference/glossary: missing trailing slash',
    ])
  })
})
