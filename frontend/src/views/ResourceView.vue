<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, ArrowUp, ArrowDown, Search } from 'lucide-vue-next'
import { api } from '../services/api'
import { useAuth } from '../stores/auth'
import { useUi } from '../stores/ui'
import { productImage, squareImage } from '../utils/images'
import type { Resource, User, Category, Product } from '../types'
import AppModal from '../components/AppModal.vue'
import MoneyText from '../components/MoneyText.vue'
type Entity = User | Category | Product
const props = defineProps<{ resource: Resource }>()
const { t } = useI18n()
const auth = useAuth()
const ui = useUi()
const rows = ref<Entity[]>([])
const categories = ref<Category[]>([])
const search = ref('')
const descending = ref(false)
const page = ref(1)
const loading = ref(true)
const failed = ref(false)
const opened = ref(false)
const busy = ref(false)
const deletion = ref<Entity>()
const id = ref<string>()
const file = ref<File>()
const preview = ref('')
const form = ref({
  name: '',
  username: '',
  password: '',
  role: 'CONTOIRISTE',
  active: true,
  description: '',
  sortOrder: 0,
  price: 0,
  categoryId: '',
  available: true,
  imageUrl: '',
})
const filtered = computed(() =>
  rows.value
    .filter((row) =>
      JSON.stringify(row).toLocaleLowerCase().includes(search.value.toLocaleLowerCase()),
    )
    .sort(
      (a, b) =>
        (props.resource === 'categories'
          ? (a as Category).sortOrder - (b as Category).sortOrder
          : a.name.localeCompare(b.name)) * (descending.value ? -1 : 1),
    ),
)
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / 8)))
const visible = computed(() => filtered.value.slice((page.value - 1) * 8, page.value * 8))
watch([search, descending], () => (page.value = 1))
async function load() {
  loading.value = true
  try {
    rows.value = await api.list<Entity>(props.resource)
    if (props.resource === 'products') categories.value = await api.list<Category>('categories')
    page.value = Math.min(page.value, pages.value)
    failed.value = false
  } catch (e) {
    failed.value = true
    ui.error(e)
  } finally {
    loading.value = false
  }
}
watch(
  () => props.resource,
  () => {
    opened.value = false
    search.value = ''
    page.value = 1
    void load()
  },
  { immediate: true },
)
function edit(row?: Entity) {
  id.value = row?._id
  file.value = undefined
  form.value = {
    name: '',
    username: '',
    password: '',
    role: 'CONTOIRISTE',
    active: true,
    description: '',
    sortOrder: rows.value.length,
    price: 0,
    categoryId: categories.value[0]?._id || '',
    available: true,
    imageUrl: '',
    ...row,
  }
  preview.value = form.value.imageUrl
  opened.value = true
}
async function chooseFile(event: Event) {
  const image = (event.target as HTMLInputElement).files?.[0]
  if (!image) return
  if (!image.type.startsWith('image/') || image.size > 2 * 1024 * 1024) {
    ui.notify(t('imageHint'), true)
    return
  }
  try {
    file.value = await squareImage(image)
    const reader = new FileReader()
    reader.onload = () => (preview.value = String(reader.result))
    reader.readAsDataURL(file.value)
  } catch (e) {
    ui.error(e)
  }
}
async function save() {
  busy.value = true
  try {
    const f = form.value
    const payload: Record<string, unknown> =
      props.resource === 'users'
        ? {
            name: f.name,
            username: f.username,
            role: f.role,
            active: f.active,
            ...(f.password ? { password: f.password } : {}),
          }
        : props.resource === 'categories'
          ? { name: f.name, description: f.description, sortOrder: f.sortOrder }
          : {
              name: f.name,
              description: f.description,
              price: f.price,
              categoryId: f.categoryId,
              available: f.available,
            }
    const result = await api.save(props.resource, id.value, payload)
    if (!id.value && result?._id) id.value = result._id
    if (file.value && props.resource === 'products') {
      if (!id.value)
        throw new Error(
          'Produit créé. Rechargez la liste et modifiez-le pour ajouter son image : la réponse API doit inclure _id.',
        )
      await api.image(id.value, file.value)
    }
    opened.value = false
    ui.notify(t('saved'))
    await load()
  } catch (e) {
    ui.error(e)
    await load()
  } finally {
    busy.value = false
  }
}
async function remove() {
  if (!deletion.value) return
  busy.value = true
  try {
    await api.remove(props.resource, deletion.value._id)
    deletion.value = undefined
    ui.notify(t('deleted'))
    await load()
  } catch (e) {
    ui.error(e)
  } finally {
    busy.value = false
  }
}
async function reorder(row: Category, direction: number) {
  const sorted = [...(rows.value as Category[])].sort((a, b) => a.sortOrder - b.sortOrder)
  const index = sorted.findIndex((c) => c._id === row._id)
  const other = sorted[index + direction]
  if (!other) return
  busy.value = true
  try {
    ;[sorted[index], sorted[index + direction]] = [other, row]
    for (let i = 0; i < sorted.length; i++)
      await api.save('categories', sorted[i]!._id, { sortOrder: i })
    await load()
  } catch (e) {
    ui.error(e)
    await load()
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">{{ t('admin') }}</p>
      <h1>{{ t(resource) }}</h1>
    </div>
    <button class="primary" @click="edit()"><Plus :size="18" />{{ t('add') }}</button>
  </div>
  <section class="card">
    <div class="toolbar">
      <label class="search"
        >{{ t('search') }}
        <div><Search :size="18" /><input v-model="search" type="search" /></div></label
      ><label
        >{{ t('sort')
        }}<select v-model="descending">
          <option :value="false">A → Z</option>
          <option :value="true">Z → A</option>
        </select></label
      >
    </div>
    <p v-if="loading" role="status" class="empty">{{ t('loading') }}</p>
    <div v-else-if="failed" class="empty">
      <button @click="load">{{ t('retry') }}</button>
    </div>
    <div v-else class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{{ t('name') }}</th>
            <th>
              {{
                t(resource === 'users' ? 'role' : resource === 'products' ? 'price' : 'sortOrder')
              }}
            </th>
            <th>
              {{
                t(
                  resource === 'users'
                    ? 'active'
                    : resource === 'products'
                      ? 'availability'
                      : 'description',
                )
              }}
            </th>
            <th>{{ t('actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in visible" :key="row._id">
            <td>
              <div class="row start">
                <img
                  v-if="resource === 'products' && (row as Product).imageUrl"
                  class="thumb"
                  :src="productImage((row as Product).imageUrl, 200)"
                  :alt="row.name"
                /><strong>{{ row.name }}</strong>
              </div>
              <small v-if="resource === 'users'">{{ (row as User).username }}</small>
            </td>
            <td>
              <template v-if="resource === 'users'">{{ (row as User).role }}</template
              ><MoneyText
                v-else-if="resource === 'products'"
                :value="(row as Product).price"
              /><template v-else>{{ (row as Category).sortOrder }}</template>
            </td>
            <td>
              <span v-if="resource === 'users'"
                >{{ (row as User).active ? '✓' : '−' }}
                {{ t((row as User).active ? 'active' : 'inactive') }}</span
              ><span
                v-else-if="resource === 'products'"
                class="badge"
                :class="(row as Product).available ? 'success' : 'danger'"
                >{{ t((row as Product).available ? 'available' : 'unavailable') }}</span
              ><span v-else>{{ (row as Category).description }}</span>
            </td>
            <td>
              <div class="row start wrap">
                <template v-if="resource === 'categories'"
                  ><button
                    class="icon"
                    :disabled="busy"
                    :aria-label="t('sortOrder') + ' ↑'"
                    @click="reorder(row as Category, -1)"
                  >
                    <ArrowUp :size="16" /></button
                  ><button
                    class="icon"
                    :disabled="busy"
                    :aria-label="t('sortOrder') + ' ↓'"
                    @click="reorder(row as Category, 1)"
                  >
                    <ArrowDown :size="16" /></button></template
                ><button class="secondary" @click="edit(row)">{{ t('edit') }}</button
                ><button
                  class="ghost danger-text"
                  :disabled="resource === 'users' && row._id === auth.user?._id"
                  @click="deletion = row"
                >
                  {{ t('remove') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!visible.length" class="empty">{{ t('empty') }}</p>
    </div>
    <div class="pagination">
      <span>{{ filtered.length }} · {{ t('page') }} {{ page }} / {{ pages }}</span>
      <div class="row">
        <button :disabled="page <= 1" @click="page--">{{ t('previous') }}</button
        ><button :disabled="page >= pages" @click="page++">{{ t('next') }}</button>
      </div>
    </div>
  </section>
  <AppModal
    v-if="opened"
    :title="t(id ? 'edit' : 'add') + ' · ' + t(resource)"
    :busy="busy"
    @close="opened = false"
    ><form @submit.prevent="save">
      <label>{{ t('name') }}<input v-model.trim="form.name" required maxlength="120" /></label
      ><template v-if="resource === 'users'"
        ><label
          >{{ t('username')
          }}<input v-model.trim="form.username" required autocomplete="off" /></label
        ><label
          >{{ t(id ? 'resetPassword' : 'newPassword')
          }}<input
            v-model="form.password"
            type="password"
            :required="!id"
            minlength="8"
            autocomplete="new-password" /></label
        ><label
          >{{ t('role')
          }}<select v-model="form.role" :disabled="id === auth.user?._id">
            <option value="ADMIN">{{ t('admin') }} · ADMIN</option>
            <option value="CAISSIER">{{ t('cashier') }} · CAISSIER</option>
            <option value="CONTOIRISTE">{{ t('kitchen') }} · CONTOIRISTE</option>
          </select></label
        ><label class="check"
          ><input v-model="form.active" type="checkbox" :disabled="id === auth.user?._id" />{{
            t('active')
          }}</label
        ></template
      ><template v-else
        ><label>{{ t('description') }}<textarea v-model="form.description" rows="3" /></label
        ><label v-if="resource === 'categories'"
          >{{ t('sortOrder')
          }}<input v-model.number="form.sortOrder" type="number" min="0" step="1" required /></label
        ><template v-else
          ><div class="form-grid">
            <label
              >{{ t('price')
              }}<input
                v-model.number="form.price"
                type="number"
                min="0"
                step="0.001"
                required /></label
            ><label
              >{{ t('category')
              }}<select v-model="form.categoryId" required>
                <option value="" disabled>{{ t('category') }}</option>
                <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.name }}</option>
              </select></label
            >
          </div>
          <label class="check"
            ><input v-model="form.available" type="checkbox" />{{ t('available') }}</label
          ><label
            >{{ t('image') }}<input type="file" accept="image/*" @change="chooseFile" /><small>{{
              t('imageHint')
            }}</small></label
          ><img v-if="preview" class="image-preview" :src="preview" :alt="form.name" /></template
      ></template>
      <div class="modal-actions">
        <button type="button" :disabled="busy" @click="opened = false">{{ t('cancel') }}</button
        ><button class="primary" :disabled="busy">{{ t(busy ? 'loading' : 'save') }}</button>
      </div>
    </form></AppModal
  ><AppModal v-if="deletion" :title="t('remove')" :busy="busy" @close="deletion = undefined"
    ><p>{{ t('deleteConfirm') }}</p>
    <strong>{{ deletion.name }}</strong>
    <div class="modal-actions">
      <button :disabled="busy" @click="deletion = undefined">{{ t('cancel') }}</button
      ><button class="danger-button" :disabled="busy" @click="remove">{{ t('remove') }}</button>
    </div></AppModal
  >
</template>
