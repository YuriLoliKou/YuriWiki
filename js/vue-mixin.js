window.thisApp = null;

let sharedDbAssembly = {
    ready: false
};

window.baseMixin = {
    data() {
        return {
            Layout: {
                headTitle: document.getElementsByTagName("title")[0].innerHTML,
            },
            authIsEnd: false,
            isLoginFlag: false,
            adminAccount: false,
            myUid: "",
        }
    },
    beforeCreate() {
        // 保持相容性
        window.thisApp = this;
    },
    created() {
        this.setHeadTitle(this.pageTitle);
    },
    async mounted() {
        try {
            const uid = await this.isLogin();
            this.myUid = uid;
            if (uid) {
                this.isLoginFlag = true;
                const uidRef = await this.dbQuery("users", uid);
                this.adminAccount = uidRef.exists();
            }
        } catch (error) {
            console.error("baseMixin mounted error:", error);
        } finally {
            this.authIsEnd = true;
        }
    },
    methods: {
        firestoreInit: function () {
            return new Promise((resolve, reject) => {
                import("./firestore.js?v=1.0.06")
                    .then(module => {
                        // 將載入好的模組賦值給共享變數
                        sharedDbAssembly = module.dbAssembly;
                        sharedDbAssembly.ready = true;
                        resolve(true);
                    })
                    .catch(err => {
                        console.error("Firestore loading failed:", err);
                        reject(err);
                    });
            });
        },
        getDbAssembly: async function () {
            if (!sharedDbAssembly.ready) {
                await this.firestoreInit();
            }
            return sharedDbAssembly;
        },
        dbInsert: async function (collectionName, data, docId = null) {
            let { addDoc, setDoc, doc, collection, db } = await this.getDbAssembly();
            if (docId != null) { return await setDoc(doc(db, collectionName, docId), data); }
            else { return await addDoc(collection(db, collectionName), data); }
        },
        dbUpdate: async function (collectionName, docId, data) {
            let { doc, updateDoc, db } = await this.getDbAssembly();
            const docRef = doc(db, collectionName, docId);
            return await updateDoc(docRef, data);
        },
        dbQuery: async function (collectionName, docId = null) {
            let { db, doc, getDoc, getDocs, collection } = await this.getDbAssembly();
            if (docId != null) { return await getDoc(doc(db, collectionName, docId)); }
            else { return await getDocs(collection(db, collectionName)); }
        },
        dbQueryByWhere: async function (collectionName, condition) {
            let { db, collection, query, where, getDocs } = await this.getDbAssembly();
            const q = query(collection(db, collectionName), condition);
            return await getDocs(q);
        },
        isLogin: async function () {
            let { isLogin } = await this.getDbAssembly();
            return await isLogin();
        },
        signIn: async function () {
            let { googleSignIn } = await this.getDbAssembly();
            return await googleSignIn();
        },
        accountSignOut: async function () {
            let { accountSignOut } = await this.getDbAssembly();
            await accountSignOut();
        },
        signInWithEmail: async function (email, password) {
            let { emailSignIn } = await this.getDbAssembly();
            return await emailSignIn(email, password);
        },
        getImage: async function (path) {
            let { getImage } = await this.getDbAssembly();
            return await getImage(path);
        },
        deleteImage: async function (fileName) {
            let { deleteImage } = await this.getDbAssembly();
            return await deleteImage(fileName);
        },
        uploadImage: async function (imageFile, fileName) {
            let { uploadImage } = await this.getDbAssembly();
            return await uploadImage(imageFile, fileName);
        },
        newGuid: function () {
            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
        },
        setHeadTitle(title) {
            if (!title) { return; }
            document.getElementsByTagName("title")[0].innerHTML = this.Layout.headTitle + ' - ' + title;
        }
    }
};
