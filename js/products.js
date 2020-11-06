const QUERIES = {
   MENU: `
      query menu($params: jsonb!) {
         menu: onDemand_getMenu(args: {params: $params}) {
            id
            data
         }
      }
   `,
   PRODUCTS: {
      SIMPLE_RECIPE_PRODUCT: `
      query simpleRecipeProduct($id: Int!) {
         simpleRecipeProduct(id: $id) {
           id
           name
           images: assets(path: "images")
           type: defaultCartItem(path: "type")
           defaultOption: defaultSimpleRecipeProductOption {
             price
           }
         }
       }     
   `,
      INVENTORY_PRODUCT: `query inventoryProduct($id: Int!) {
         inventoryProduct(id: $id) {
           id
           name
           images: assets(path: "images")
           type: defaultCartItem(path: "type")
           defaultOption: defaultInventoryProductOption {
             price
           }
         }
       }
       `
   }
}

const fetch_data = async ({ query, variables }) => {
   try {
      const URL = 'https://riofitmeals.dailykit.org/datahub/v1/graphql'
      const ADMIN_SECRET = '8b8e4dd5-243d-4060-b77b-a1934f7ed087'
      const response = await fetch(URL, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': ADMIN_SECRET
         },
         body: JSON.stringify({
            query,
            variables
         })
      })
      const { data = {} } = await response.json()
      return { success: true, data }
   } catch (error) {
      return {
         success: false,
         error: error.message
      }
   }
}

const category = (id, name) => `
<li class="nav-item">
   <a class="nav-link ${
      id === 1 ? 'active' : ''
   }" data-toggle="tab" href="#${id}">
      <div class="product-tab-content text-center">
         <h4>${name}</h4>
      </div>
   </a>
</li>
`

const category_products = (id, name) => {
   const isActive = id === 1 ? 'active' : ''
   return `
   <div class="tab-pane fade show ${isActive}" id="${id}" role="tabpanel" aria-labelledby="${id}" >
      <div class="row" data-category="${name}">
      </div>
      <div data-category-button="${name}"></div>
   </div>
 `
}

const product = ({ id, type, name, image, price }) => {
   return `
      <div class="col-xl-3 col-lg-3 col-md-6">
         <div class="product-wrapper text-center mb-30">
            <div class="product2-img">
               <a target="_blank" rel="noopener noreferrer" href="https://riofitmeals.dailykit.org/store/ProductPage?id=${id}&type=${type}"><img src="${image}" alt="" /></a>
               <div class="product-action">
                  <a target="_blank" rel="noopener noreferrer" href="https://riofitmeals.dailykit.org/store/ProductPage?id=${id}&type=${type}"><i class="fas fa-shopping-cart"></i></a>
               </div>
            </div>
            <div class="product-text product2-text">
               <h4><a target="_blank" rel="noopener noreferrer" href="https://riofitmeals.dailykit.org/store/ProductPage?id=${id}&type=${type}">${name}</a></h4>
               <div class="pro-price">
                  <span>$ ${price}</span>
               </div>
            </div>
         </div>
      </div>
   `
}

;(function ($) {
   const categories_listing = $('#categories__listing')
   const products_listing = $('#products__listing')

   ;(async () => {
      const { success, ...response } = await fetch_data({
         query: QUERIES.MENU,
         variables: {
            params: {
               brandId: 1,
               date: new Date().toISOString().slice(0, 10)
            }
         }
      })

      if (success) {
         const { menu = [] } = response.data
         if (menu.length > 0) {
            const [menu_item = {}] = menu

            const { menu: categories = [] } = menu_item.data
            if (categories.length === 0) {
               categories_listing.empty()
               categories_listing.append('No menu available today!')
               return
            }
            let categories_html = categories.map((item, index) =>
               category(index + 1, item.name)
            )
            categories_listing.empty()
            categories_listing.append(categories_html)

            let category_products_html = categories.map((item, index) =>
               category_products(index + 1, item.name)
            )
            categories_listing.empty()
            categories_listing.append(categories_html)
            products_listing.empty()
            products_listing.append(category_products_html)

            categories.forEach(async category => {
               const {
                  name,
                  comboProducts,
                  customizableProducts,
                  ...rest
               } = category
               let products_listing_container = $(`[data-category='${name}']`)
               let products_listing_button = $(
                  `[data-category-button='${name}']`
               )

               const types = {
                  inventoryProducts: 'INVENTORY_PRODUCT',
                  simpleRecipeProducts: 'SIMPLE_RECIPE_PRODUCT'
               }

               if (
                  rest.simpleRecipeProducts.length === 0 &&
                  rest.inventoryProducts.length === 0
               ) {
                  products_listing_container.append(
                     '<h5 class="mb-3 w-100 text-center">No products available in this category</h5>'
                  )
                  return
               }

               for (let [type, products] of Object.entries(rest)) {
                  products.forEach(async id => {
                     const { success, ...response } = await fetch_data({
                        query: QUERIES.PRODUCTS[types[type]],
                        variables: {
                           id
                        }
                     })

                     if (success) {
                        if (type === 'simpleRecipeProducts') {
                           const {
                              data: { simpleRecipeProduct = {} } = {}
                           } = response
                           products_listing_container.append(
                              product({
                                 id: simpleRecipeProduct.id,
                                 name: simpleRecipeProduct.name,
                                 type: simpleRecipeProduct.type,
                                 image:
                                    simpleRecipeProduct.images.length > 0
                                       ? simpleRecipeProduct.images[0]
                                       : '',
                                 ...(simpleRecipeProduct.defaultOption && {
                                    price:
                                       simpleRecipeProduct.defaultOption.price
                                          .length > 0
                                          ? simpleRecipeProduct.defaultOption
                                               .price[0].value
                                          : ''
                                 })
                              })
                           )
                        } else if (type === 'inventoryProducts') {
                           const {
                              data: { inventoryProduct = {} } = {}
                           } = response
                           products_listing_container.append(
                              product({
                                 id: inventoryProduct.id,
                                 name: inventoryProduct.name,
                                 type: inventoryProduct.type,
                                 image:
                                    inventoryProduct.images.length > 0
                                       ? inventoryProduct.images[0]
                                       : '',
                                 ...(inventoryProduct.defaultOption && {
                                    price:
                                       inventoryProduct.defaultOption.price
                                          .length > 0
                                          ? inventoryProduct.defaultOption
                                               .price[0].value
                                          : ''
                                 })
                              })
                           )
                        }
                     }
                  })
               }
               products_listing_button.empty()
               products_listing_button.append(`<div class="col-xl-12 align-items-center text-center">
                        <a class="btn"  target="_blank" rel="noopener noreferrer" href="https://riofitmeals.dailykit.org/store/CategoryProductsPage?category=${name}"
                           >View All Products</a
                        >
                     </div>`)
            })
         }
      } else {
         categories_listing.empty()
         categories_listing.append('No menu available today!')
         return
      }
   })()
})(jQuery)
