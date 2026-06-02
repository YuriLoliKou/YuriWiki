export default {
	data() {
		return {
			pageTitle: '管理頁面',

			savedMangaData: {},
			savedMangaImage: {},
			tagData: [],
			isEventHandlerRegistered: false,

			manga_name: '',
			manga_originalName: '',
			manga_author: '',
			manga_originalAuthor: '',
			manga_tags: [],

			manga_delete_name: '',

			manga_show: false,
			manga_message: '',
			manga_success: false,

			manga_json_show: false,
			manga_json_message: '',
			manga_json_success: false,

			manga_delete_show: false,
			manga_delete_message: '',
			manga_delete_success: 1,
		}
	},
	created() {
		//this.signIn();
		this.loadAddedMangasData();
	},
	computed: {
		getStyleMangaMessage() {
			if (this.manga_success == true) {
				return {
					color: "aqua",
				};
			} else {
				return {
					color: "red",
				};
			}
		},

		getStyleMangaJsonMessage() {
			if (this.manga_json_success == true) {
				return {
					color: "aqua",
				};
			} else {
				return {
					color: "red",
				};
			}
		},

		getStyleMangaDeleteMessage() {
			switch (this.manga_delete_success) {
				case 1:
					return {
						color: "aqua",
					};
				case 2:
					return {
						color: "red",
					};
				case 3:
					return {
						color: "chocolate",
					};
			}
		},
	},
	methods: {
		loadAddedMangasData() {
			const AddedMangasData = localStorage.getItem('AddedMangasData');
			const AddedMangasImage = localStorage.getItem('AddedMangasImage');

			if (AddedMangasData) {
				this.savedMangaData = JSON.parse(AddedMangasData);
			}
			if (AddedMangasImage) {
				this.AddedMangasImage = JSON.parse(AddedMangasImage);
			}
		},

		async submitMangaForm() {
			let addedId = '';

			this.manga_tags.sort(function (a, b) {
				return a - b;
			});

			try {
				//const formDataJson = JSON.stringify(this.savedMangaData[this.manga_id]);
				//const formDataObj = JSON.parse(formDataJson);

				//選擇圖片
				const fileInput = document.getElementById('fileInput');
				const handleFileChange = async (e) => {
					this.manga_show = true;

					const file = e.target.files[0];
					if (file) {
						const fileExtension = file.name.split('.').pop();
						if (fileExtension != 'jpg') {
							this.manga_show = false;
							this.showMessage('manga_message', 'manga_success', false, "請選擇jpg檔!!", 3000);
							return;
						}
						const formData = {
							name: this.manga_name,
							originalName: this.manga_originalName,
							author: this.manga_author,
							originalAuthor: this.manga_originalAuthor,
							tags: this.manga_tags,
						};
						//新增資料進Firestore並取得ID後本地化儲存
						const docRef = await this.dbInsert("Manga", formData);
						addedId = docRef.id;
						this.savedMangaData[addedId] = formData;
						localStorage.setItem('AddedMangasData', JSON.stringify(this.savedMangaData));
						// 將圖片命名為文檔ID
						const fileNameWithId = addedId + '.' + fileExtension;
						const fileName = 'Manga/' + fileNameWithId;
						//下載圖片備份
						const modifiedFile = new File([file], fileNameWithId, { type: file.type });
						const downloadLink = document.createElement('a');
						downloadLink.href = URL.createObjectURL(modifiedFile);
						downloadLink.download = modifiedFile.name;
						downloadLink.click();
						URL.revokeObjectURL(downloadLink.href);
						// 上傳圖片至 Firebase Cloud Storage
						await this.uploadImage(file, fileName);
						this.savedMangaImage[addedId] = await this.getImage(fileName);
						localStorage.setItem('AddedMangasImage', JSON.stringify(this.savedMangaImage));
						this.manga_show = false;
						this.clearFormMessage();
						//輸出結果
						this.showMessage('manga_message', 'manga_success', true, "上傳成功!!", 3000);
						console.log('資料已成功寫入Firestore');
					} else {
						this.manga_show = false;
						this.showMessage('manga_message', 'manga_success', false, "請選擇圖片!!", 3000);
					}
				};

				if (!this.isEventHandlerRegistered) {
					fileInput.addEventListener('change', handleFileChange);
					this.isEventHandlerRegistered = true;
				}
				fileInput.click();

			} catch (error) {
				this.manga_show = false;
				this.deleteMangaData(addedId);
				this.clearFormMessage();
				//輸出結果
				this.showMessage('manga_message', 'manga_success', false, "上傳失敗!!", 3000);
				console.error('資料寫入失敗：', error);
			}
		},

		async deleteMangaData(Id) {
			try {
				this.manga_show = true;
				delete this.savedMangaData[Id];
				localStorage.setItem('AddedMangasData', JSON.stringify(this.savedMangaData));
				delete this.savedMangaImage[Id];
				localStorage.setItem('AddedMangasImage', JSON.stringify(this.savedMangaImage));
				await this.dbDeleteDoc("Manga", Id);
				const deletePath = "Manga/" + Id + '.jpg';
				await this.deleteImage(deletePath);

				this.manga_show = false;
				this.showMessage('manga_message', 'manga_success', true, "ID: " + Id + "刪除成功", 3000);
			} catch (error) {
				this.manga_show = false;
				this.showMessage('manga_message', 'manga_success', false, "ID: " + Id + "刪除失敗", 3000);
			}

		},

		async generateMangaDataForJson() {
			try {
				//是否有新增資料
				if (Object.keys(this.savedMangaData).length == 0) {
					this.showMessage('manga_json_message', 'manga_json_success', false, "尚未新增資料!!", 1500);
					return;
				}
				this.manga_json_show = true;
				//讀取Firestore數據將Json文字轉為物件
				const mangaList = await this.dbQuery("Json", "Manga");
				const jsonString = mangaList.data().jsonString;
				let jsonData = JSON.parse(jsonString);
				//新增數據至Json物件
				const keys = Object.keys(this.savedMangaData);
				for (let i = 0; i < keys.length; i++) {
					jsonData[keys[i]] = this.savedMangaData[keys[i]];
				}
				//重新排序
				const sortedKeys = Object.keys(jsonData).sort((a, b) => {
					const nameA = jsonData[a].name;
					const nameB = jsonData[b].name;
					// 判斷是否為英文字符串
					const isEnglishA = /^[a-zA-Z]/.test(nameA);
					const isEnglishB = /^[a-zA-Z]/.test(nameB);
					// 根據英文與非英文字符串的不同進行排序
					if (isEnglishA && !isEnglishB) {
						return -1; // a 在 b 前面
					} else if (!isEnglishA && isEnglishB) {
						return 1; // b 在 a 前面
					} else {
						return nameA.localeCompare(nameB); // 默認
					}
				});
				//先放入array照順序排序，再轉回物件再轉為Json
				const sortedArray = [];
				sortedKeys.forEach(key => {
					const item = {
						[key]: jsonData[key]
					};
					sortedArray.push(item);
				});
				const sortedObject = sortedArray.reduce((obj, item) => {
					const key = Object.keys(item)[0];
					obj[key] = item[key];
					return obj;
				}, {});
				jsonData = sortedObject;
				console.log(jsonData);
				console.log(JSON.stringify(jsonData));
				//更新Firestore數據
				await this.dbUpdate("Json", "Manga", {
					jsonString: JSON.stringify(jsonData)
				});
				//刪除本地新增的數據
				this.savedMangaData = {};
				this.savedMangaImage = {};
				localStorage.setItem('AddedMangasData', JSON.stringify(this.savedMangaData));
				localStorage.setItem('AddedMangasImage', JSON.stringify(this.savedMangaImage));
				this.manga_json_show = false;
				//輸出結果
				this.showMessage('manga_json_message', 'manga_json_success', true, "Json資料更新成功!!", 1500);
				console.log('Json資料已成功寫入Firestore');
			} catch (error) {
				this.manga_json_show = false;
				this.showMessage('manga_json_message', 'manga_json_success', false, "Json資料更新失敗!!", 1500);
				console.error('Json資料寫入失敗：', error);
			}

		},

		async deleteMangaDataByName() {
			try {
				this.manga_delete_show = true;
				let jsonDataExist = false;
				let mangaDataExist = false;
				let imageDataExist = false;
				//讀取Firestore數據將Json文字轉為物件
				const mangaList = await this.dbQuery("Json", "Manga");
				const jsonString = mangaList.data().jsonString;
				//console.log(jsonString)
				let jsonData = JSON.parse(jsonString);
				//刪除Json文件內指定名稱的文件
				const keys = Object.keys(jsonData);
				for (let i = 0; i < keys.length; i++) {
					if (jsonData[keys[i]].name == this.manga_delete_name) {
						jsonDataExist = true;
						delete jsonData[keys[i]];
					}
				}
				//刪除資料庫中Manga集合內指定name的文件
				let { where } = await this.getDbAssembly();
				const condition = where("name", "==", this.manga_delete_name);
				const querySnapshot = await this.dbQueryByWhere("Manga", condition);

				for (let i = 0; i < querySnapshot.docs.length; i++) {
					console.log('刪除符合ID: ', querySnapshot.docs[i].id)
					await this.dbDeleteDoc("Manga", querySnapshot.docs[i].id);
					mangaDataExist = true;
				}
				//Json物件轉為Json文字後更新資料庫Json數據
				await this.dbUpdate("Json", "Manga", {
					jsonString: JSON.stringify(jsonData)
				});
				//刪除Firebase Cloud圖片
				for (let i = 0; i < querySnapshot.docs.length; i++) {
					console.log('刪除符合ID圖片: ', querySnapshot.docs[i].id)
					const deletePath = "Manga/" + querySnapshot.docs[i].id + '.jpg';
					await this.deleteImage(deletePath);
					imageDataExist = true;
				}
				this.manga_delete_show = false;
				//輸出結果
				let resultText = jsonDataExist == true ? "Json資料刪除成功!!\n" : "Json資料刪除失敗!!\n";
				resultText += mangaDataExist == true ? "Manga數據刪除成功!!\n" : "Manga數據刪除失敗!!\n";
				resultText += imageDataExist == true ? "Image數據刪除成功!!\n" : "Image數據刪除失敗!!\n";

				if (jsonDataExist && mangaDataExist && imageDataExist) {
					this.showMessage('manga_delete_message', 'manga_delete_success', 1, resultText, 3000);
					this.manga_delete_name = '';
					console.log('資料刪除成功');
				} else if (jsonDataExist || mangaDataExist || imageDataExist) {
					this.showMessage('manga_delete_message', 'manga_delete_success', 3, resultText, 6000);
					console.log('資料部分刪除成功');
				} else {
					this.showMessage('manga_delete_message', 'manga_delete_success', 2, "查無資料!!", 3000);
					console.log('查無符合資料');
				}
			} catch (error) {
				this.manga_delete_show = false;
				this.showMessage('manga_delete_message', 'manga_delete_success', 2, "資料刪除失敗", 3000);
				console.error('資料刪除失敗：', error);
			}
		},

		async fetchTagsData() {
			const cachedTagsData = localStorage.getItem('TagsData');
			if (cachedTagsData) {
				this.tagData = JSON.parse(cachedTagsData);
			} else {
				try {
					let tagList = await this.dbQuery("Tags", "MangaSetting");
					//將讀取到的tagList轉為array照id順序保存
					const array = Object.entries(tagList.data()).map(([key, value]) => {
						const id = key.padStart(3, '0');
						return { id, ...value };
					});
					// 依照讀取到sequence進行排序並存入tagData
					this.tagData = array.sort((a, b) => a.sequence - b.sequence);
					//本地化儲存
					localStorage.setItem('TagsData', JSON.stringify(this.tagData));
					console.log("fetchTagsData Success");
				} catch (error) {
					console.error("Error fetching tags data:", error);
				}
			}
		},

		formatTags(tags) {
			let tagsString = [];
			if (tags) {
				for (tag of tags) {
					const filteredData = this.tagData.filter(obj => obj.id === tag).map(obj => obj.name);
					//console.log(filteredData)
					tagsString.push(filteredData);
				}
			}
			return tagsString.join(', ');
		},

		clearFormMessage() {
			this.manga_id = '';
			this.manga_name = '';
			this.manga_originalName = '';
			this.manga_author = '';
			this.manga_originalAuthor = '';
			this.manga_tags = [];
		},

		showMessage(obj, obj_flag, flag, text, duration) {
			this[obj_flag] = flag;
			this[obj] = text;
			setTimeout(() => {
				this[obj] = '';
			}, duration);
		},
	},
	watch: {

	},
	async mounted() {
		this.fetchTagsData();
	}
}