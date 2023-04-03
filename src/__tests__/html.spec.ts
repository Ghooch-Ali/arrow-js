import { html, reactive, nextTick, ArrowTemplate } from '..'
import { click, setValue } from './utils/events'
import { describe, it, expect, vi } from 'vitest'
import {
  attrCommentPos,
  createChunk,
  createExpression,
  createHTML,
  getPath,
} from '../html'
interface User {
  name: string
  id: number
}

// describe.only('pathed chunks', () => {
//   it('can produce DOM nodes with no expressions', () => {
//     expect(false).toBe(true)
//   })
// })

describe('createExpression', () => {
  it('can swap out the expression from createExpression', () => {
    const expression1 = vi.fn(() => 'foo')
    const expression2 = vi.fn(() => 'bar')
    const expression = createExpression(expression1)
    expect(expression()).toBe('foo')
    expression._up(expression2)
    expect(expression()).toBe('bar')
  })

  it('can swap out the expression from createExpression', () => {
    const expression1 = vi.fn(() => 'foo')
    const expression2 = vi.fn(() => 'bar')
    const listener = vi.fn()
    const expression = createExpression(expression1)
    expression.$on(listener)
    expression._up(expression2)
    expect(listener).toBeCalledTimes(1)
  })
})

describe('getPath', () => {
  it('can locate the path of items at the root', () => {
    const template = document.createElement('template')
    template.innerHTML = `<div></div><!---->`
    const comment = template.content.childNodes[1]
    const path = getPath(comment)
    expect(path).toEqual([1])
  })
  it('can locate the path of items at the root', () => {
    const template = document.createElement('template')
    template.innerHTML = `<div><h1><span>here</span>there<input></h1></div>`
    const input = template.content.querySelector('input')!
    const path = getPath(input)
    expect(path).toEqual([0, 0, 2])
  })
})

describe('createChunk', () => {
  it('can create a dom fragment from a simple static template', () => {
    const chunk = createChunk(['<div><h1></h1></div>'])
    expect(chunk.dom).toBeInstanceOf(DocumentFragment)
    expect(chunk.dom.childNodes[0]).toBeInstanceOf(HTMLDivElement)
    expect(chunk.dom.childNodes[0].childNodes[0]).toBeInstanceOf(
      HTMLHeadingElement
    )
    expect(chunk.paths).toEqual([])
  })
  it('can create a dom fragment with a basic expression in the body', () => {
    const chunk = createChunk(['<div>', '</div>'])
    expect(chunk.dom).toBeInstanceOf(DocumentFragment)
    expect(chunk.dom.childNodes[0]).toBeInstanceOf(HTMLDivElement)
    expect(chunk.dom.childNodes[0].childNodes[0]).toBeInstanceOf(Comment)
    expect(chunk.paths).toEqual([[0, 0]])
  })
  it('can create a dom fragment with a basic expression in the body and an attribute', () => {
    const chunk = createChunk(['<div data-foo="', '">', '</div>'])
    expect(chunk.dom).toBeInstanceOf(DocumentFragment)
    expect(chunk.dom.childNodes[0]).toBeInstanceOf(HTMLDivElement)
    expect(chunk.dom.childNodes[0].childNodes.length).toBe(1)
    const mountPoint = document.createElement('div')
    mountPoint.appendChild(chunk.dom)
    expect(mountPoint.innerHTML).toBe('<div data-foo="❲❍❳"><!--➳❍--></div>')
    expect(chunk.paths).toEqual([
      [0, 'data-foo'],
      [0, 0],
    ])
  })
  it('can create a dom fragment with a multiple basic expression in the body and an attributes', () => {
    // prettier-ignore
    const chunk = createChunk(['<div data-foo="', "\" hidden=", '>', "<span class=", " style=", '>', '</span></div>'])
    expect(chunk.dom).toBeInstanceOf(DocumentFragment)
    expect(chunk.dom.childNodes[0]).toBeInstanceOf(HTMLDivElement)
    expect(chunk.dom.childNodes[0].childNodes.length).toBe(2)
    const mountPoint = document.createElement('div')
    mountPoint.appendChild(chunk.dom)
    expect(mountPoint.innerHTML).toBe(
      '<div data-foo="❲❍❳" hidden="❲❍❳"><!--➳❍--><span class="❲❍❳" style="❲❍❳"><!--➳❍--></span></div>'
    )
    expect(chunk.paths).toEqual([
      [0, 'data-foo'],
      [0, 'hidden'],
      [0, 0],
      [0, 1, 'class'],
      [0, 1, 'style'],
      [0, 1, 0],
    ])
  })
})

describe('createHTML', () => {
  it('ignores empty templates', () => {
    const html = createHTML([''])
    expect(html).toBe('')
  })
  it('adds a delimiter even when there is no html', () => {
    const html = createHTML(['', ''])
    expect(html).toBe('<!--➳❍-->')
  })
  it('adds multiple delimiters even when there is no html', () => {
    const html = createHTML(['', '', '', ''])
    expect(html).toBe('<!--➳❍--><!--➳❍--><!--➳❍-->')
  })
  it('can place a delimiter comment inside an element', () => {
    const html = createHTML(['<div>', '</div>'])
    expect(html).toBe(`<div><!--➳❍--></div>`)
  })
  it('can place a delimiter comment after a self closing element', () => {
    const html = createHTML(['<input>', ''])
    expect(html).toBe(`<input><!--➳❍-->`)
  })
  it('can place an attr delimiter comment after a self closing element', () => {
    const html = createHTML(['<input type=', ' >', ''])
    expect(html).toBe(`<input type=❲❍❳ ><!--❲❍❳--><!--➳❍-->`)
  })
})

describe('attrCommentPos', () => {
  it('can find the position of an attribute comment', () => {
    // prettier-ignore
    const left = ["<input type="]
    const right = [' data-foo="bar">']
    const [stackIndex, posIndex] = attrCommentPos(left, right)
    expect(stackIndex).toBe(0)
    expect(posIndex).toBe(16)
  })
  it('can find the position of an attribute comment in the second index of the right hand stack', () => {
    // prettier-ignore
    const left = ["<input type="]
    const right = [' data-foo="', '">']
    const [stackIndex, posIndex] = attrCommentPos(left, right)
    expect(stackIndex).toBe(1)
    expect(posIndex).toBe(2)
  })

  it('can find the position of an attribute comment in the second index of the right hand stack', () => {
    // prettier-ignore
    const left = ["<input data-bar=\"", "\" type="]
    const right = [' data-foo="', '"> things here']
    const [stackIndex, posIndex] = attrCommentPos(left, right)
    expect(stackIndex).toBe(1)
    expect(posIndex).toBe(2)
  })

  it('can find the position of an attribute comment in the second index of the right hand stack', () => {
    // prettier-ignore
    const left = ["&lt;input type="]
    const right = [' data-foo="', '">']
    const [stackIndex, posIndex] = attrCommentPos(left, right)
    expect(stackIndex).toBe(null)
    expect(posIndex).toBe(null)
  })
  it('does not find a position if the opening < is inside quotes', () => {
    // prettier-ignore
    const left = ['&lt;input type="<div"=']
    const right = [' data-foo="', '">']
    const [stackIndex, posIndex] = attrCommentPos(left, right)
    expect(stackIndex).toBe(null)
    expect(posIndex).toBe(null)
  })
  it('can find the correct position if the opening < is in the middle of some html', () => {
    // prettier-ignore
    const left = ["<p>Hello</p> <div data-foo=\""]
    const right = ['" data-bar="', '">', ' some stuff in here </div>']
    const [stackIndex, posIndex] = attrCommentPos(left, right)
    expect(stackIndex).toBe(1)
    expect(posIndex).toBe(2)
  })
  it('can find the correct position attributes contain < >and escaped quotes', () => {
    // prettier-ignore
    const left = ["<p>Hello</p> <div data-html=\"<!--\\\"here-there\\\"-->\" data-foo=\""]
    // prettier-ignore
    const right = ['" data-bar="', "\" data-post-html=\"<!--\\\"here-there\\\"-->\"><p></p>', ' some stuff in here </div>"]
    const [stackIndex, posIndex] = attrCommentPos(left, right)
    expect(stackIndex).toBe(1)
    expect(posIndex).toBe(41)
  })
  it('can immediately break out when finding a < outside quotes in the front stack', () => {
    // prettier-ignore
    const left = ["<input type="]
    const right = ['" data-foo="bar" <div></div>']
    const [stackIndex, posIndex] = attrCommentPos(left, right)
    expect(stackIndex).toBe(null)
    expect(posIndex).toBe(null)
  })
  it('can immediately break out when finding a < outside quotes in the front stack', () => {
    // prettier-ignore
    const left = ["<input <div> type="]
    const right = ['" data-foo="bar">']
    const [stackIndex, posIndex] = attrCommentPos(left, right)
    expect(stackIndex).toBe(null)
    expect(posIndex).toBe(null)
  })
  it('returns null when attributes contain < > and escaped quotes but the ending quote is never found', () => {
    // prettier-ignore
    const left = ["<p>Hello</p> <div data-html=\"<!--\\\"here-there\\\"-->' data-foo=\""]
    // prettier-ignore
    const right = ['" data-bar="', "\" data-post-html=\"<!--\\\"here-there\\\"-->'><p></p>', ' some stuff in here </div>"]
    const [stackIndex, posIndex] = attrCommentPos(left, right)
    expect(stackIndex).toBe(null)
    expect(posIndex).toBe(null)
  })
})

describe('html', () => {
  it('can render simple strings', () => {
    const nodes = html`foo bar`().childNodes
    expect(nodes.length).toBe(1)
    expect(nodes[0].nodeName).toBe('#text')
    expect(nodes[0].nodeValue).toBe('foo bar')
  })

  it('can render simple numeric expressions', () => {
    const nodes = html`${10 * 10}`().childNodes
    expect(nodes.length).toBe(1)
    expect(nodes[0].nodeName).toBe('#text')
    expect(nodes[0].nodeValue).toBe('100')
  })

  it('can render simple text with expressions', async () => {
    const world = 'World'
    const fragment = html`Hello ${world}`()
    const nodes = fragment.childNodes
    await nextTick()
    expect(nodes.length).toBe(2)
    expect(nodes[0].nodeName).toBe('#text')
    expect(fragment.textContent).toBe('Hello World')
  })

  it('can render reactive data once without arrow fn', async () => {
    const data = reactive({ name: 'World' })
    const node = html`Hello ${data.name}`()
    expect(node.childNodes.length).toBe(2)
    expect(node.textContent).toBe('Hello World')
    data.name = 'Justin'
    await nextTick()
    expect(node.textContent).toBe('Hello World')
  })

  it('can render reactive data once without arrow fn at depth', async () => {
    const data = reactive({ name: 'world' })
    const parent = document.createElement('div')
    html`<div><h1>Hello ${data.name}</h1></div>`(parent)
    expect(parent.innerHTML).toBe('<div><h1>Hello world</h1></div>')
    data.name = 'Justin'
    await nextTick()
    expect(parent.innerHTML).toBe('<div><h1>Hello world</h1></div>')
  })

  it('can render static expression in an attribute', async () => {
    const data = reactive({ name: 'world' })
    const parent = document.createElement('div')
    html`<div data-foo="${true}">
      <h1 data-disappear="${false}">Hello ${data.name}</h1>
    </div>`(parent)
    expect(parent.innerHTML).toMatchSnapshot()
    data.name = 'Justin'
    await nextTick()
    expect(parent.innerHTML).toMatchSnapshot()
  })

  it('automatically updates expressions with arrow fn', async () => {
    const data = reactive({ name: 'World' })
    const parent = document.createElement('div')
    html`Hello ${() => data.name}`(parent)
    expect(parent.textContent).toBe('Hello World')
    data.name = 'Justin'
    await nextTick()
    expect(parent.textContent).toBe('Hello Justin')
  })

  it('can create a token expression at the beginning of template', async () => {
    const data = reactive({ name: 'Hello' })
    const parent = document.createElement('div')
    html`${() => data.name} Worldilocks`(parent)
    expect(parent.textContent).toBe('Hello Worldilocks')
    data.name = 'Justin'
    await nextTick()
    expect(parent.textContent).toBe('Justin Worldilocks')
  })

  it('can place expression nested inside some elements inside a string', async () => {
    const data = reactive({ name: 'Hello' })
    const parent = document.createElement('div')
    html`This is cool
      <div>
        And here is more text
        <h2>Name: ${() => data.name} ok?</h2>
      </div>
      <span>${data.name}</span>`(parent)
    expect(parent.innerHTML).toMatchSnapshot()
    data.name = 'Justin'
    await nextTick()
    expect(parent.innerHTML).toMatchSnapshot()
  })

  it('can sub-render templates without reactivity.', async () => {
    const data = reactive({ name: 'World' })
    const parent = document.createElement('div')
    html`Hello ${html`<div>${data.name}</div>`}`(parent)
    expect(parent.innerHTML).toBe('Hello <div>World</div>')
    data.name = 'Justin'
    await nextTick()
    expect(parent.innerHTML).toBe('Hello <div>World</div>')
  })

  it('can render a simple non-reactive list', async () => {
    const data = reactive({ list: ['a', 'b', 'c'] })
    const parent = document.createElement('div')
    html`Hello
      <ul>
        ${data.list.map((item: string) => html`<li>${item}</li>`)}
      </ul>`(parent)
    expect(parent.innerHTML).toMatchSnapshot()
    data.list[1] = 'Justin'
    await nextTick()
    // We shouldn't see any changes because that list was non-reactive.
    expect(parent.innerHTML).toMatchSnapshot()
  })

  it('can render a simple reactive list that pushes a new reactive value on', async () => {
    const data = reactive({ list: ['a', 'b', 'c'] })
    const parent = document.createElement('div')
    html`Hello
      <ul>
        ${() => data.list.map((item: string) => html`<li>${() => item}</li>`)}
      </ul>`(parent)
    expect(parent.innerHTML).toMatchSnapshot()
    data.list.push('next')
    await nextTick()
    expect(parent.innerHTML).toMatchSnapshot()
  })

  it('can render a simple reactive list that unshifts a new reactive value on', async () => {
    const data = reactive({ list: ['a', 'b', 'c'] })
    const parent = document.createElement('div')
    html`Hello
      <ul>
        ${() => data.list.map((item: string) => html`<li>${() => item}</li>`)}
      </ul>`(parent)
    // expect(parent.innerHTML).toMatchSnapshot()
    const firstListItem = parent.querySelector('li')
    data.list.unshift('0')
    await nextTick()
    const listValues: string[] = []
    parent
      .querySelectorAll('li')
      .forEach((el) => listValues.push(el.textContent!))
    expect(listValues).toEqual(['0', 'a', 'b', 'c'])
    expect(parent.querySelector('li')).toBe(firstListItem)
    // expect(parent.innerHTML).toMatchSnapshot()
  })

  it('does not re-render a simple list that changes a static value', async () => {
    const data = reactive({ list: ['a', 'b', 'c'] })
    const parent = document.createElement('div')
    html`Hello
      <ul>
        ${() => data.list.map((item: string) => html`<li>${item}</li>`)}
      </ul>`(parent)
    data.list[1] = 'foo'
    await nextTick()
    const listValues: string[] = []
    parent
      .querySelectorAll('li')
      .forEach((el) => listValues.push(el.textContent!))
    expect(listValues).toEqual(['a', 'b', 'c'])
  })

  it.only('can render a simple reactive list that shifts a static value off', async () => {
    const data = reactive({ list: ['a', 'b', 'c'] })
    const parent = document.createElement('div')
    html`Hello
      <ul>
        ${() => data.list.map((item: string) => html`<li>${item}</li>`)}
      </ul>`(parent)
    // expect(parent.innerHTML).toMatchSnapshot()
    expect(parent.querySelectorAll('li').length).toBe(3)
    data.list.shift()
    await nextTick()
    // expect(parent.querySelectorAll('li').length).toBe(2)
    const listValues: string[] = []
    parent
      .querySelectorAll('li')
      .forEach((el) => listValues.push(el.textContent!))
    expect(listValues).toEqual(['b', 'c'])
  })

  it('can render a list with multiple repeated roots.', () => {
    const data = reactive({ list: ['a', 'b', 'c'] })
    const parent = document.createElement('div')
    html`<div>
      ${() =>
        data.list.map(
          (item: string) =>
            html`<h2>${item}</h2>
              <p>foobar</p>`
        )}
    </div>`(parent)
    expect(parent.innerHTML).toMatchSnapshot()
  })

  it('can render a list with new values un-shifted on', async () => {
    const data = reactive({ list: ['a', 'b', 'c'] })
    const parent = document.createElement('div')
    html`<ul>
      ${() => data.list.map((item: string) => html`<li>${item}</li>`)}
    </ul>`(parent)
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>b</li><li>c</li>
    </ul>`)
    data.list.unshift('z', 'x')
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>z</li><li>x</li><li>a</li><li>b</li><li>c</li>
    </ul>`)
  })

  it('can render a list with new values pushed', async () => {
    const data = reactive({ list: ['a', 'b', 'c'] })
    const parent = document.createElement('div')
    html`<ul>
      ${() => data.list.map((item: string) => html`<li>${item}</li>`)}
    </ul>`(parent)
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>b</li><li>c</li>
    </ul>`)
    data.list.push('z', 'x')
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>b</li><li>c</li><li>z</li><li>x</li>
    </ul>`)
  })

  it('can render a list with new values spliced in', async () => {
    const data = reactive({ list: ['a', 'b', 'c'] })
    const parent = document.createElement('div')
    html`<ul>
      ${() => data.list.map((item: string) => html`<li>${item}</li>`)}
    </ul>`(parent)
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>b</li><li>c</li>
    </ul>`)
    data.list.splice(1, 2, 'z', 'y', 'x', 'l')
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>z</li><li>y</li><li>x</li><li>l</li>
    </ul>`)
  })

  it('can render a list with new values spliced in', async () => {
    const data = reactive({ list: ['a', 'b', 'c'] })
    const parent = document.createElement('div')
    html`<ul>
      ${() => data.list.map((item: string) => html`<li>${item}</li>`)}
    </ul>`(parent)
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>b</li><li>c</li>
    </ul>`)
    data.list.splice(1, 2, 'z', 'y', 'x', 'l')
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>z</li><li>y</li><li>x</li><li>l</li>
    </ul>`)
  })

  it('can render a list with a for loop', async () => {
    const data = reactive({ list: ['a', 'b', 'c'] as string[] })
    const parent = document.createElement('div')
    function list(items: any[]): Array<CallableFunction> {
      const els: ArrowTemplate[] = []
      for (const i in items) {
        els.push(html`<li>${items[i]}</li>`)
      }
      return els
    }
    html`<ul>
      ${() => list(data.list)}
    </ul>`(parent)
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>b</li><li>c</li>
    </ul>`)
    data.list.push('item')
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>b</li><li>c</li><li>item</li>
    </ul>`)
  })

  it('can remove items from a mapped list by splicing', async () => {
    const data = reactive({
      list: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
    })
    const parent = document.createElement('div')
    html`<ul>
      ${() => data.list.map((item) => html`<li>${() => item.name}</li>`)}
    </ul>`(parent)
    expect(parent.innerHTML).toBe(`<ul>
      <li>a</li><li>b</li><li>c</li>
    </ul>`)
    data.list.splice(0, 1)
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>b</li><li>c</li>
    </ul>`)
    data.list.splice(0, 1)
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>c</li>
    </ul>`)
    data.list.splice(0, 1)
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <!---->
    </ul>`)
  })

  it('can render a list from an object', async () => {
    const data = reactive({
      food: {
        main: 'Pizza',
        desert: 'ice cream',
      },
    })
    const parent = document.createElement('div')
    function list(items: any): Array<CallableFunction> {
      const els: ArrowTemplate[] = []
      for (const i in items) {
        els.push(html`<li>${i}: ${items[i]}</li>`)
      }
      return els
    }
    html`<ul>
      ${() => list(data.food)}
    </ul>`(parent)
    expect(parent.innerHTML).toBe(`<ul>
      <li>main: Pizza</li><li>desert: ice cream</li>
    </ul>`)
    data.food.breakfast = 'bacon'
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>main: Pizza</li><li>desert: ice cream</li><li>breakfast: bacon</li>
    </ul>`)
  })

  it('re-uses nodes that had sub value change.', async () => {
    const data = reactive({
      list: [
        { name: 'Justin', id: 3 },
        { name: 'Luan', id: 1 },
        { name: 'Andrew', id: 2 },
      ],
    })
    const parent = document.createElement('div')
    html`<ul>
      ${() => data.list.map((user: User) => html`<li>${() => user.name}</li>`)}
    </ul>`(parent)
    expect(parent.innerHTML).toBe(`<ul>
      <li>Justin</li><li>Luan</li><li>Andrew</li>
    </ul>`)
    const first = parent.querySelector('li')
    data.list[0].name = 'Bob'
    await nextTick()
    expect(first).toBe(parent.querySelector('li'))
    expect(parent.innerHTML).toBe(`<ul>
      <li>Bob</li><li>Luan</li><li>Andrew</li>
    </ul>`)
  })

  it('can move keyed nodes in a list', async () => {
    const data = reactive({
      list: [
        { name: 'Justin', id: 3 },
        { name: 'Luan', id: 0 },
        { name: 'Andrew', id: 0 },
      ] as Array<{ name: string; id: number }>,
    })
    const parent = document.createElement('div')
    html`<ul>
      ${() =>
        data.list.map((user: User) =>
          html`<li>${() => user.name}</li>`.key(user.id)
        )}
    </ul>`(parent)

    parent.querySelector('li')?.setAttribute('data-is-justin', 'true')
    data.list.splice(0, 1)
    data.list.push(
      reactive({ name: 'Justin', id: 3 }),
      reactive({ name: 'Fred', id: 0 })
    )
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>Luan</li><li>Andrew</li><li data-is-justin="true">Justin</li><li>Fred</li>
    </ul>`)
  })

  it('can sort keyed nodes in a list', async () => {
    const data = reactive({
      list: [
        { name: 'Justin', id: 3 },
        { name: 'Luan', id: 1 },
        { name: 'Andrew', id: 2 },
      ],
    })
    const parent = document.createElement('div')
    html`<ul>
      ${() =>
        data.list.map((user: User) =>
          html`<li>${() => user.name}</li>`.key(user.id)
        )}
    </ul>`(parent)
    parent.querySelector('li')?.setAttribute('data-is-justin', 'true')
    parent
      .querySelector('li:nth-child(2)')
      ?.setAttribute('data-is-luan', 'true')
    parent
      .querySelector('li:nth-child(3)')
      ?.setAttribute('data-is-andrew', 'true')
    data.list.sort((a: User, b: User) => {
      return a.name > b.name ? 1 : -1
    })
    // await nextTick()
    // expect(parent.innerHTML).toBe(`<ul>
    //   <li data-is-andrew="true">Andrew</li><li data-is-justin="true">Justin</li><li data-is-luan="true">Luan</li>
    // </ul>`)
  })

  it('can update the values in keyed nodes', async () => {
    const data = reactive({
      list: [
        { name: 'Justin', id: 3 },
        { name: 'Luan', id: 1 },
        { name: 'Andrew', id: 2 },
      ],
    })
    const parent = document.createElement('div')
    html`<ul>
      ${() =>
        data.list.map((user: User) =>
          html`<li>${() => user.name}</li>`.key(user.id)
        )}
    </ul>`(parent)
    data.list[0].name = 'Bob'
    data.list[1] = { name: 'Jeff', id: 1 }
    data.list[2].name = 'Fred'
    await nextTick()
    expect(parent.innerHTML).toBe(`<ul>
      <li>Bob</li><li>Jeff</li><li>Fred</li>
    </ul>`)
  })

  it('can render results of multiple data objects', async () => {
    const a = reactive({ price: 45 })
    const b = reactive({ quantity: 25 })
    const parent = document.createElement('div')
    html`${() => a.price * b.quantity}`(parent)
    expect(parent.innerHTML).toBe('1125')
    a.price = 100
    await nextTick()
    expect(parent.innerHTML).toBe('2500')
  })

  it('can conditionally swap nodes', async () => {
    const data = reactive({
      price: 100,
      promo: 'free',
      showPromo: false,
    })
    const parent = document.createElement('div')
    const componentA = html`Price: ${() => data.price}`
    const componentB = html`Promo: <input type="text" />`
    html`<div class="checkout">
      ${() => (data.showPromo ? componentB : componentA)}
    </div>`(parent)
    expect(parent.innerHTML).toBe(`<div class="checkout">
      Price: 100
    </div>`)
    data.showPromo = true
    await nextTick()
    expect(parent.innerHTML).toBe(`<div class="checkout">
      Promo: <input type="text">
    </div>`)
  })

  it('can conditionally show/remove nodes', async () => {
    const data = reactive({
      showPromo: false,
    })
    const parent = document.createElement('div')
    // Note: this test seems obtuse but it isn't since it performing this toggle
    // action multiple times stress tests the underlying placeholder mechanism.
    const promo = html`Promo: <input type="text" />`
    html`<div class="checkout">${() => data.showPromo && promo}</div>`(parent)
    expect(parent.innerHTML).toMatchSnapshot()
    data.showPromo = true
    await nextTick()
    expect(parent.innerHTML).toMatchSnapshot()
    data.showPromo = false
    await nextTick()
    expect(parent.innerHTML).toMatchSnapshot()
    data.showPromo = true
    await nextTick()
    expect(parent.innerHTML).toMatchSnapshot()
  })

  it('outputs the boolean true, but not the boolean false', () => {
    const parent = document.createElement('div')
    expect(
      (html`${() => true}${() => false}`(parent) as Element).innerHTML
    ).toBe('true<!---->')
  })

  it('can render an attribute', () => {
    const parent = document.createElement('div')
    const data = reactive({
      org: 'braid',
    })
    expect(
      (html`<div data-org="${() => data.org}"></div>`(parent) as Element)
        .innerHTML
    ).toBe(`<div data-org="braid"></div>`)
  })

  it('can remove and re-add multiple attributes', async () => {
    const parent = document.createElement('div')
    const data = reactive({
      org: 'braid' as boolean | string,
      precinct: false as boolean | string,
      state: 'virginia',
    })
    html`<div x-precinct="${() => data.precinct}" data-org="${() => data.org}">
      ${() => data.state}
    </div>`(parent) as Element
    await nextTick()
    expect(parent.innerHTML).toMatchSnapshot()
    data.precinct = 'cville'
    await nextTick()
    expect(parent.innerHTML).toMatchSnapshot()
    data.org = false
    await nextTick()
    expect(parent.innerHTML).toMatchSnapshot()
    data.org = 'other'
    data.state = 'california'
    await nextTick()
    expect(parent.innerHTML).toMatchSnapshot()
  })

  it('can render nested nodes with attribute expressions', async () => {
    const parent = document.createElement('div')
    const data = reactive({
      country: 'usa',
      states: [
        { name: 'virginia', abbr: 'va' },
        { name: 'nebraska', abbr: 'ne' },
        { name: 'california', abbr: 'ca' },
      ],
    })
    html`<ul data-country="${data.country}">
      ${() =>
        data.states.map(
          (state: any) =>
            html`<li data-abbr="${() => state.abbr}">${() => state.name}</li>`
        )}
      <li data-first-abbr="${() => data.states[0].abbr}">
        ${() => data.states[0].name}
      </li>
    </ul> `(parent)
    expect(parent.innerHTML).toMatchSnapshot()
    data.states.sort((a: any, b: any) => {
      return a.abbr > b.abbr ? 1 : -1
    })
    await nextTick()
    expect(parent.innerHTML).toMatchSnapshot()
  })

  it('can render the number zero', async () => {
    const parent = document.createElement('div')
    html`${() => 0}|${0}`(parent)
    expect(parent.innerHTML).toBe('0|0')
  })

  it('can bind to native events as easily as pecan pie', async () => {
    const parent = document.createElement('div')
    const data = reactive({ value: '' })
    const update = (event: InputEvent) => {
      data.value = (event.target as HTMLInputElement).value
    }
    html`<input type="text" @input="${update}" />${() => data.value}`(parent)
    setValue(parent.querySelector('input'), 'pizza')
    await nextTick()
    expect(parent.innerHTML).toBe('<input type="text">pizza')
  })

  it('sets the IDL value attribute on input elements', async () => {
    const parent = document.createElement('div')
    const data = reactive({ value: '' })
    const update = (event: InputEvent) => {
      data.value = (event.target as HTMLInputElement).value
    }
    html`<input
        type="text"
        value="${() => data.value}"
        @input="${update}"
        id="a"
      />
      <input
        type="text"
        value="${() => data.value}"
        @input="${update}"
        id="b"
      />${() => data.value}`(parent)
    const a = parent.querySelector('[id="a"]') as HTMLInputElement
    const b = parent.querySelector('[id="b"]') as HTMLInputElement
    setValue(a, 'pizza')
    await nextTick()
    expect(b.value).toBe('pizza')
    setValue(b, 'pie')
    await nextTick()
    expect(a.value).toBe('pie')
    expect(a.getAttribute('value')).toBe(null)
  })

  it('sets the IDL checked attribute on checkbox elements', async () => {
    const parent = document.createElement('div')
    const data = reactive({ checked: false })
    html`<input type="checkbox" checked="${() => data.checked}" id="a" />`(
      parent
    )
    const a = parent.querySelector('[id="a"]') as HTMLInputElement
    expect(a.checked).toBe(false)
    a.checked = true
    await nextTick()
    expect(a.checked).toBe(true)
    expect(data.checked).toBe(false)
    data.checked = true
    await nextTick()
    expect(a.checked).toBe(true)
    data.checked = false
    await nextTick()
    expect(a.checked).toBe(false)
    expect(a.getAttribute('checked')).toBe(null)
  })

  it('cleans up event listeners when a node has been removed', async () => {
    const clickHandler = vi.fn()
    const parent = document.createElement('div')
    const data = reactive({
      show: true,
    })
    html`${() =>
      data.show ? html`<button @click="${clickHandler}"></button>` : ''}`(
      parent
    )
    let button = parent.querySelector('button') as HTMLButtonElement
    click(button)
    expect(clickHandler).toHaveBeenCalledTimes(1)
    data.show = false
    await nextTick()
    click(button)
    expect(clickHandler).toHaveBeenCalledTimes(1)
    data.show = true
    await nextTick()
    button = parent.querySelector('button') as HTMLButtonElement
    click(button)
    expect(clickHandler).toHaveBeenCalledTimes(2)
  })

  it('defaults to the proper option select element', () => {
    const parent = document.createElement('div')
    const data = reactive({ selected: 'b' })
    html`<select>
      <option value="a" selected="${() => 'a' === data.selected}">A</option>
      <option value="b" selected="${() => 'b' === data.selected}">B</option>
      <option value="c" selected="${() => 'c' === data.selected}">C</option>
    </select>`(parent)
    expect(parent.querySelector('select')?.value).toBe('b')
  })

  it('can create a table with dynamic columns and rows', () => {
    const parent = document.createElement('div')
    const rows = [
      ['Detroit', 'MI'],
      ['Boston', 'MA'],
    ]
    html`<table>
      <tbody>
        ${rows.map(
          (row) =>
            html`<tr>
              ${row.map((column) => html`<td>${column}</td>`)}
            </tr>`
        )}
      </tbody>
    </table>`(parent)
    expect(parent.innerHTML).toMatchSnapshot()
  })

  // it('renders sanitized HTML when reading from a variable.', () => {
  //   const data = reactive({
  //     foo: '<h1>Hello world</h1>',
  //   })
  //   expect(html`<div>${() => data.foo}</div>`().querySelector('h1')).toBe(null)
  // })
  it('renders sanitized HTML when updating from a variable.', async () => {
    const data = reactive({
      html: 'foo',
    })
    const stage = document.createElement('div')
    html`<div>${() => data.html}</div>`(stage)
    data.html = '<h1>Some text</h1>'
    await nextTick()
    expect(stage.querySelector('h1')).toBe(null)
  })
  it('renders keyed list and updates child value without removing/moving any nodes', async () => {
    const data = reactive({
      list: [
        {
          id: 1,
          name: 'foo',
        },
        {
          id: 2,
          name: 'bar',
        },
      ],
    })
    const stage = document.createElement('div')
    html`<ul>
      ${() =>
        data.list.map((item) =>
          html` <li>
            ${() => item.name}<input
              @input="${(e: InputEvent) => {
                item.name = (e.target as HTMLInputElement).value
              }}"
            />
          </li>`.key(item.id)
        )}
    </ul>`(stage)
    const callback = vi.fn()
    const observer = new MutationObserver(callback)
    observer.observe(stage.querySelector('ul')!, { childList: true })
    const input = stage.querySelector('input') as HTMLInputElement
    setValue(input, 'foobar')
    await nextTick()
    expect(callback).not.toHaveBeenCalled()
  })

  it('can render an empty template', async () => {
    const div = document.createElement('div')
    const store = reactive({ show: true })
    expect(() =>
      html`${() => (store.show ? html`<br />` : html``)}`(div)
    ).not.toThrow()
    expect(div.innerHTML).toBe('<br>')
    store.show = false
    await nextTick()
    expect(div.innerHTML).toBe('<!---->')
  })

  it('can render an array of items and mutate an item in the array (#49)', async () => {
    const div = document.createElement('div')
    const data = reactive({ order: [1, 2, 3] })
    html`<ul>
      ${() => data.order.map((item) => html`<li>${item}</li>`)}
    </ul>`(div)
    data.order[1] += 10
    await nextTick()
    expect(div.innerHTML).toMatchSnapshot()
  })

  it('can set any arbitrary IDL attribute', async () => {
    const div = document.createElement('div')
    class XFoo extends HTMLDivElement {
      foo: string
      constructor() {
        super()
        this.foo = 'bar'
      }
    }
    customElements.define('x-foo', XFoo, { extends: 'div' })
    const data = reactive({ foo: 'bim' })
    html`<x-foo .foo="${() => data.foo}"></x-foo>`(div)
    const x = div.querySelector('x-foo') as XFoo
    expect(x.foo).toBe('bim')
    data.foo = 'baz'
    await nextTick()
    expect(x.foo).toBe('baz')
    expect(x.getAttribute('foo')).toBe(null)
  })
})

describe('html text nodes', () => {
  it('updates the the text node itself rather than creating new ones', async () => {
    const parent = document.createElement('div')
    const data = reactive({ text: 'foo' })
    html`<span>${() => data.text}</span>`(parent)
    const initialNode = parent.children[0].childNodes[0]
    expect(initialNode).toBeInstanceOf(Text)
    expect(initialNode.nodeValue).toBe('foo')
    data.text = 'bar'
    await nextTick()
    const postNode = parent.children[0].childNodes[0]
    expect(postNode.nodeValue).toBe('bar')
    expect(initialNode === postNode).toBe(true)
  })
})
