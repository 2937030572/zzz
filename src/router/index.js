import { createRouter, createWebHistory } from 'vue-router'
import LoginRegisterLayout from '../layouts/LoginRegister.vue'
import DashboardLayout from '../layouts/Dashboard.vue'
import { registerOff } from '../stores/globals'
import axios from 'axios'
import i18n from '../i18n'

(async () => {
    async function getRegisterPage() {
        return new Promise((resolve, reject) => {
            console.log("\nGETTING REGISTER PAGE")
            axios.post('/api/registerPage')
                .then((response) => {
                    //console.log(" response "+JSON.stringify(response))
                    //localStorage.setItem('parse_app_id', response.data)
                    //console.log("  --> App id in localstorage " + localStorage.getItem('parse_app_id'))
                    registerOff.value = response.data
                    resolve()
                })
                .catch((error) => {
                    console.log(" -> Error getting register page " + error)
                    reject(error)
                });


        })
    }

    await getRegisterPage()
})();


const router = createRouter({
    history: createWebHistory(
        import.meta.env.BASE_URL),
    routes: [{
        path: '/',
        redirect: '/dashboard'
    },
    {
        path: '/dashboard',
        name: 'dashboard',
        meta: {
            titleKey: "nav.dashboard",
            layout: DashboardLayout
        },
        component: () =>
            import('../views/Dashboard.vue')
    },
    {
        path: '/calendar',
        name: 'calendar',
        meta: {
            titleKey: "nav.calendar",
            layout: DashboardLayout
        },
        component: () =>
            import('../views/Calendar.vue')
    },
    {
        path: '/daily',
        name: 'daily',
        meta: {
            titleKey: "nav.daily",
            layout: DashboardLayout
        },
        component: () =>
            import('../views/Daily.vue')
    },
    {
        path: '/diary',
        name: 'diary',
        meta: {
            titleKey: "nav.diary",
            layout: DashboardLayout
        },
        component: () =>
            import('../views/Diary.vue')
    },
    {
        path: '/screenshots',
        name: 'screenshots',
        meta: {
            titleKey: "nav.screenshots",
            layout: DashboardLayout
        },
        component: () =>
            import('../views/Screenshots.vue')
    },
    {
        path: '/playbook',
        name: 'playbook',
        meta: {
            titleKey: "nav.playbook",
            layout: DashboardLayout
        },
        component: () =>
            import('../views/Playbook.vue')
    },
    {
        path: '/addTrades',
        name: 'addTrades',
        meta: {
            titleKey: "nav.addTrades",
            layout: DashboardLayout
        },
        component: () =>
            import('../views/AddTrades.vue')
        
    },
    {
        path: '/addDiary',
        name: 'addDiary',
        meta: {
            titleKey: "nav.addDiary",
            layout: DashboardLayout
        },
        component: () =>
            import('../views/AddDiary.vue')
    },
    {
        path: '/addPlaybook',
        name: 'addPlaybook',
        meta: {
            titleKey: "nav.addPlaybook",
            layout: DashboardLayout
        },
        component: () =>
            import('../views/AddPlaybook.vue')
    },
    {
        path: '/addScreenshot',
        name: 'addScreenshot',
        meta: {
            titleKey: "nav.addScreenshot",
            layout: DashboardLayout
        },
        component: () =>
            import('../views/AddScreenshot.vue')
    },
    {
        path: '/addExcursions',
        name: 'addExcursions',
        meta: {
            titleKey: "nav.addExcursions",
            layout: DashboardLayout
        },
        component: () =>
            import('../views/AddExcursions.vue')
    },
    {
        path: '/settings',
        name: 'settings',
        meta: {
            titleKey: "nav.settings",
            layout: DashboardLayout
        },
        component: () =>
            import('../views/Settings.vue')
    },
    {
        path: '/imports',
        name: 'imports',
        meta: {
            titleKey: "nav.imports",
            layout: DashboardLayout
        },
        component: () =>
            import('../views/Imports.vue')
    },
    {
        path: '/checkout',
        name: 'checkout',
        meta: {
            titleKey: "nav.checkout",
            layout: DashboardLayout
        },
        component: () =>
            import('../views/Checkout.vue')
    },
    {
        path: '/checkoutSuccess',
        name: 'checkoutSuccess',
        meta: {
            titleKey: "nav.checkoutSuccess",
            layout: DashboardLayout
        },
        component: () =>
            import('../views/CheckoutSuccess.vue')
    }
    ]
})

router.beforeEach((to, from, next) => {
    // Get the page title from the route meta data that we have defined
    // See further down below for how we setup this data
    const titleKey = to.meta.titleKey
    // If the route has a titleKey, translate it and set it as the page title
    if (titleKey) {
        document.title = i18n.global.t(titleKey)
    }
    // Continue resolving the route
    next()
})

export default router