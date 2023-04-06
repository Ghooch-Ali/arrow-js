import { html, reactive } from '@src/index'
import store from '../store'

export default function () {
  const d = reactive({
    trayIsOpen: false,
  })

  document.addEventListener('click', (e) => {
    if (!e.target.closest('nav')) {
      d.trayIsOpen = false
    }
  })

  function makeList(items) {
    return html`<ul>
      ${items.map(
        (item) => html` <li data-selected="${() => store.section === item.id}">
          <a href="${`#${item.id}`}">${() => item.title}</a>
          ${item.children && item.children.length && makeList(item.children)}
        </li>`
      )}
    </ul>`
  }
  const listOfLinks = makeList(store.navigation)

  return html`<nav class="navigation">
    <div
      class="selection"
      @click="${() => {
        d.trayIsOpen = !d.trayIsOpen
      }}"
      data-is-open="${() => d.trayIsOpen}"
    >
      ${listOfLinks}
    </div>
  </nav>`
}
