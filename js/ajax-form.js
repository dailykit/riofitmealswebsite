$(function () {
   const fetch_query = async (query, variables) => {
      try {
         const response = await fetch(URL, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               'x-hasura-admin-secret': ADMIN_SECRET
            },
            body: JSON.stringify({ query, variables })
         })
         const { data = {} } = await response.json()
         return { success: true, data }
      } catch (error) {
         return { success: false, error }
      }
   }
   // Get the form.
   const form = $('#contact-us-form')

   const URL = 'https://riofitmeals.dailykit.org/datahub/v1/graphql'
   const ADMIN_SECRET = '8b8e4dd5-243d-4060-b77b-a1934f7ed087'

   // Get the messages div.
   const form_response = $('.ajax-response')

   // Set up an event listener for the contact form.
   $(form).submit(async function (e) {
      e.preventDefault()

      let toEmail = ''
      try {
         const query = `
            query emails($domain: String) {
               emails: brands_brand_storeSetting(
                  where: {
                     onDemandSetting: {
                        identifier: { _eq: "Contact" }
                        brand: {
                           brand: {
                              _or: [
                                 { domain: { _eq: $domain } }
                                 { isDefault: { _eq: true } }
                              ]
                           }
                        }
                     }
                  }
               ) {
                  email: value(path: "email")
               }
            }
         `
         const { success, ...rest } = await fetch_query(query, {
            domain: window.location.hostname
         })
         if (success) {
            const { emails = [] } = rest.data
            if (emails.length > 0) {
               toEmail = emails[0].email
            } else {
               throw rest.error
            }
         }
      } catch (error) {
         console.log('Failed fetching email to send the mail from:', error)
      }

      if (toEmail) {
         const form = Object.fromEntries(new FormData(e.target))
         const query = `
            mutation sendEmail($emailInput: EmailInput!) {
               sendEmail(emailInput: $emailInput) {
                  message
                  success
               }
            }
         `

         try {
            const variables = {
               emailInput: {
                  to: toEmail,
                  attachments: [],
                  from: 'no-reply@dailykit.org',
                  subject: `${form.name} filled your form on your website. Please check!`,
                  html: `
                     <h4>Name: ${form.name}</h4>
                     <h4>Email: ${form.email}</h4>
                     <p>Message: ${form.message}</p>
                  `
               }
            }
            const { success, ...rest } = await fetch_query(query, variables)
            if (success) {
               const { sendEmail = {} } = rest.data
               if ('success' in sendEmail && sendEmail.success) {
                  $(form_response).text(sendEmail.message)
                  $('#contact-us-form input,#contact-us-form textarea').val('')

                  try {
                     const variables = {
                        emailInput: {
                           to: form.email,
                           attachments: [],
                           from: 'no-reply@dailykit.org',
                           subject: `From RioFitMeals`,
                           html: `
                              <h4>Thanks for your message.</h4>
                              <h4>Here's your message.</h4>
                              <p>${form.message}</p>
                           `
                        }
                     }
                     const { success, ...rest } = await fetch_query(
                        query,
                        variables
                     )
                     if (!success) {
                        throw rest.error
                     }
                  } catch (error) {
                     console.log('Failed sending to submitter:', error)
                  }
               }
            } else {
               throw rest.error
            }
         } catch (error) {
            console.log('Failed sending to RioFitMeals:', error)
            $(form_response).text(
               'Oops! An error occured and your message could not be sent.'
            )
         }
      }
   })
})
