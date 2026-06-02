export default {
	data() {
		return {
			mangaData: {},
			tagList: [],
			hiddenTagList: [],
			dynamicTagList: [],
			dynamicHiddenTagList: [],
			searchType: "partial",
			searchMode: 1,
			tagType: [],
			tagData: [],
			urlData: {},

			dynamicTags: [],
			dynamicTagsTemp: [],
			newTagLabel: '',
			newTagColor: '#000000',
			selectedDynamicTagType: 'frame',
			dynamicTagsOptions: [
				{ value: 'frame', label: '外框' },
				{ value: 'card', label: '卡片' },
			],
			isLoadCustomizationData: false,
			addDynamicTagIdTemp: '',

			showPopup: false,
			popupCondition: '',

			listGrid: '',
			listGridMode: '1',
			listGridPicture: 'col-auto col-sm-3 col-lg-2',
			listGridTagPosition: {},
			listGridMainData: 'mb-0 px-0 col-3 col-sm-2 col-lg-1',
			listGridMainData2: 'mb-0 col-9 col-sm-10 col-lg-11',
			listGridMainData3: 'mb-0 col-9 col-sm-10 col-lg-11',
			listGridMainStyle3: {},
			listGridShowDetail: [],
		}
	},
	computed: {
		visibleCount() {
			return Object.entries(this.mangaData).reduce((count, [key, v]) => {
				return count + (this.hasIntersection(v.tags, this.tagList, key) ? 1 : 0);
			}, 0);
		},

		isTagChecked() {
			return (value) => {
				if (value < 9999) {
					return this.hiddenTagList.includes(value);
				} else {
					return this.dynamicHiddenTagList.includes(value);
				}
			}
		},

		filteredTags() {
			return (tagType) => {
				const filteredTags = Object.entries(this.tagData)
					.filter(([key, value]) => value.attribute == tagType)
					.reduce((result, [key, value]) => {
						result[key] = value;
						return result;
					}, {});
				return filteredTags;
			};
		},

		isTagsTempEqualToTags() {
			return JSON.stringify(this.dynamicTagsTemp) === JSON.stringify(this.dynamicTags);
		}
	},
	methods: {
		hasIntersection(ItemTags, tagList, id) {
			if (tagList.length <= 0 && this.dynamicTagList.length <= 0) { return true; }

			let found = false;

			switch (this.searchType) {
				case "partial":
					found = tagList.some((tag) => ItemTags.includes(tag)) && !this.hiddenTagList.some((tag) => ItemTags.includes(tag));

					for (const item of this.dynamicTags) {
						if (this.dynamicHiddenTagList.includes(item.id)) {
							if (item.tagList && item.tagList.includes(id)) {
								found = false;
								break;
							}
						}
						if (this.dynamicTagList.includes(item.id)) {
							if (item.tagList && item.tagList.includes(id) && !this.hiddenTagList.some((tag) => ItemTags.includes(tag))) {
								found = true;
							}
						}
					}
					break;
				case "exact":
					found = tagList.every((tag) => ItemTags.includes(tag)) && !this.hiddenTagList.some((tag) => ItemTags.includes(tag));
					if (!found) { break; }

					for (const item of this.dynamicTags) {
						if (this.dynamicHiddenTagList.includes(item.id)) {
							if (item.tagList && item.tagList.includes(id)) {
								found = false;
								break;
							}
						}
						if (this.dynamicTagList.includes(item.id)) {
							if (item.tagList && item.tagList.includes(id) && tagList.every((tag) => ItemTags.includes(tag))) {
								found = true;
							}
							else {
								found = false;
								break;
							}
						}
					}
					break;
			}
			return found;
		},

		async getFirestoreData() {
			const cachedMangaData = localStorage.getItem('MangasData');
			const cachedTagsData = localStorage.getItem('TagsData');
			const cachedImagesData = localStorage.getItem('ImagesData');
			let firstLoad = false;

			if (cachedMangaData) {
				this.mangaData = JSON.parse(cachedMangaData);
			} else {
				await this.fetchMangasData();
				firstLoad = true;
			}

			if (cachedTagsData && !firstLoad) {
				this.tagData = JSON.parse(cachedTagsData);
				const attributes = new Set(Object.values(this.tagData).map(obj => obj.attribute));
				this.tagType = Array.from(attributes).sort((a, b) => a.localeCompare(b));
			} else {
				await this.fetchTagsData();
			}

			if (cachedImagesData && !firstLoad) {
				this.urlData = JSON.parse(cachedImagesData);
			} else {
				await this.fetchImagesData();
			}

			localStorage.setItem('MangasData', JSON.stringify(this.mangaData));
			if (!firstLoad) { await this.checkFirestoreData(cachedMangaData); }
		},

		async fetchMangasData() {
			try {
				let mangaList = await this.dbQuery("Json", "Manga");
				const jsonString = mangaList.data().jsonString;
				const jsonData = JSON.parse(jsonString);
				this.mangaData = jsonData;
				console.log("fetchMangasData Success");
			} catch (error) {
				console.error("Error fetching mangas data:", error);
			}
		},

		async fetchTagsData() {
			try {
				let tagList = await this.dbQuery("Tags", "MangaSetting");
				const attributes = new Set(Object.values(tagList.data()).map(obj => obj.attribute));
				this.tagType = Array.from(attributes).sort((a, b) => a.localeCompare(b));
				const array = Object.entries(tagList.data()).map(([key, value]) => {
					const id = key.padStart(3, '0');
					return { id, ...value };
				});
				this.tagData = array.sort((a, b) => a.sequence - b.sequence);
				localStorage.setItem('TagsData', JSON.stringify(this.tagData));
				console.log("fetchTagsData Success");
			} catch (error) {
				console.error("Error fetching tags data:", error);
			}
		},

		async fetchImagesData() {
			try {
				const keys = Object.keys(this.mangaData);
				for (let i = 0; i < keys.length; i++) {
					const imagePath = 'Manga/' + keys[i] + '.jpg';
					            const result = await this.getImage(imagePath);

            console.log({
                key: keys[i],
                imagePath,
                result
            });

            this.urlData[keys[i]] = result;
				}
				localStorage.setItem('ImagesData', JSON.stringify(this.urlData));
				console.log("fetchImagesData Success");
			} catch (error) {
				console.error("Error fetching Images data:", error);
			}
		},

		async checkFirestoreData(cachedMangaData) {
			await this.fetchMangasData();
			if (cachedMangaData != JSON.stringify(this.mangaData)) {
				await this.fetchTagsData();
				await this.fetchImagesData();
				localStorage.setItem('MangasData', JSON.stringify(this.mangaData));
			}
		},

		async fetchCustomizationData() {
			let customizationData = await this.dbQuery("Customization", this.myUid);
			if (customizationData.exists()) {
				const tagData = customizationData.data().tag;
				const sortedArray = Object.entries(tagData).sort((a, b) => a[0] - b[0]);
				this.dynamicTags = sortedArray.map(([key, value]) => ({ id: Number(key), ...value }));
			}
			this.isLoadCustomizationData = true;
		},

		updateHiddenTagList(value) {
			let index;
			let hideIndex;
			let tagListTemp;
			let hiddenTagListTemp;
			if (value < 9999) {
				tagListTemp = this.tagList;
				hiddenTagListTemp = this.hiddenTagList;
				index = this.tagList.indexOf(value);
				hideIndex = this.hiddenTagList.indexOf(value);
			} else {
				tagListTemp = this.dynamicTagList;
				hiddenTagListTemp = this.dynamicHiddenTagList;
				index = this.dynamicTagList.indexOf(value);
				hideIndex = this.dynamicHiddenTagList.indexOf(value);
			}

			switch (this.searchMode) {
				case 1:
					if (hideIndex !== -1) {
						hiddenTagListTemp.splice(hideIndex, 1);
					}
					break;
				case 2:
					if (index !== -1) {
						tagListTemp.splice(index, 1);
						if (hideIndex != -1) {
							hiddenTagListTemp.splice(hideIndex, 1);
						} else {
							hiddenTagListTemp.push(value);
						}
					} else {
						hiddenTagListTemp.push(value);
					}
					break;
			}
		},

		formatTags(tags) {
			let tagsString = [];
			for (const tag of tags) {
				const filteredData = this.tagData.filter(obj => obj.id === tag).map(obj => obj.name);
				tagsString.push(filteredData);
			}
			return tagsString.join(', ');
		},

		selectAllTags() {
			this.hiddenTagList = [];
			this.tagList = this.tagData.map(obj => obj.id);
			this.dynamicHiddenTagList = [];
			this.dynamicTagList = this.dynamicTags.map((tag, index) => 9999 + index);
		},
		clearAllTags() {
			this.tagList = [];
			this.hiddenTagList = [];
			this.dynamicTagList = [];
			this.dynamicHiddenTagList = [];
		},
		async addTag() {
			if (this.newTagLabel) {
				this.dynamicTags.push({ id: this.dynamicTags.length + 9999, label: this.newTagLabel, color: this.newTagColor, type: this.selectedDynamicTagType, tagList: [] });
				this.dynamicTagsTemp = JSON.parse(JSON.stringify(this.dynamicTags));
				this.newTagLabel = '';

				const formData = { tag: {} };
				for (let i = 0; i < this.dynamicTags.length; i++) {
					const tagId = 9999 + i;
					formData.tag[tagId] = {
						label: this.dynamicTags[i].label,
						color: this.dynamicTags[i].color,
						type: this.dynamicTags[i].type,
						tagList: this.dynamicTags[i].tagList
					};
				}
				await this.dbInsert("Customization", formData, this.myUid)
					.catch(error => {
						this.dynamicTags.pop();
						this.dynamicTagsTemp.pop();
						alert("新增標籤失敗!");
					});
			}
		},
		async updateTag() {
			const formData = { tag: {} };
			for (let i = 0; i < this.dynamicTagsTemp.length; i++) {
				const tagId = 9999 + i;
				formData.tag[tagId] = {
					label: this.dynamicTagsTemp[i].label,
					color: this.dynamicTagsTemp[i].color,
					type: this.dynamicTagsTemp[i].type,
					tagList: this.dynamicTagsTemp[i].tagList
				};
			}
			await this.dbInsert("Customization", formData, this.myUid)
				.catch(error => {
					alert("更新失敗!");
					return;
				});
			this.dynamicTags = this.dynamicTagsTemp;
			this.hideModal();
		},
		removeTag(index) {
			this.dynamicTagsTemp.splice(index, 1);
		},
		updateNewTagColor(color) {
			this.newTagColor = color;
		},
		updateTagColor: _.debounce(function (index, color) {
			this.dynamicTagsTemp[index].color = color;
			console.log(this.dynamicTagsTemp)
		}, 300),
		filteredDynamicTag(tag) {
			return this.dynamicTags.filter(t => t.type === tag);
		},
		filteredDynamicTagTemp(tag) {
			return this.dynamicTagsTemp.filter(t => t.type === tag);
		},
		keyTotalCountInDynamicTags(id) {
			return this.dynamicTags.filter(tag => (tag.tagList && tag.tagList.includes(id)) && tag.type === 'frame');
		},
		dynamicTagsBackgroundStyle(id) {
			if (this.dynamicTags.length <= 0) { return null; }

			const cardTags = this.dynamicTags.filter(tag => (tag.tagList && tag.tagList.includes(id)) && tag.type === 'card');
			let gradientColors = cardTags.map(tag => tag.color).join(', ');

			if (cardTags.length === 0) { gradientColors = 'white, white'; }
			if (cardTags.length === 1) { gradientColors = `${gradientColors}, ${gradientColors}`; }

			return {
				backgroundImage: `linear-gradient(to right, ${gradientColors})`,
			};
		},
		isBookmark(id) {
			let isExist = false;
			for (const tag of this.dynamicTags) {
				if (tag.tagList && tag.tagList.includes(id)) {
					isExist = true;
				}
			}
			return isExist;
		},
		showModal(condition, id = null) {
			this.popupCondition = condition;
			if (condition == 1) {
				this.dynamicTagsTemp = JSON.parse(JSON.stringify(this.dynamicTags));
			}

			if (id != null) {
				this.dynamicTagsTemp = JSON.parse(JSON.stringify(this.dynamicTags));
				this.addDynamicTagIdTemp = id;
			}

			this.showPopup = true;
		},
		hideModal() {
			this.showPopup = false;
		},
		listChange(mode) {
			this.listGridMode = mode;
			switch (mode) {
				case 1:
					this.listGrid = 'col-12';
					this.listGridPicture = 'col-auto col-sm-3 col-lg-2';
					this.listGridTagPosition = {};
					this.listGridMainData = 'mb-0 px-0 col-3 col-sm-2 col-lg-1';
					this.listGridMainData2 = 'mb-0 col-9 col-sm-10 col-lg-11';
					this.listGridMainData3 = 'mb-0 col-9 col-sm-10 col-lg-11';
					this.listGridMainStyle3 = {};
					break;
				case 2:
					this.listGrid = 'col-12 col-sm-4 col-md-3 col-lg-2';
					this.listGridPicture = 'col-auto col-sm-12';
					this.listGridTagPosition = { top: '6px', right: '6px' };
					this.listGridMainData = 'mb-0 px-0 col-3 col-sm-5 col-lg-4';
					this.listGridMainData2 = 'mb-0 col-9 col-sm-7 col-lg-8';
					this.listGridMainData3 = 'mb-0 col-12';
					this.listGridMainStyle3 = { 'text-align': 'center', 'white-space': 'nowrap', overflow: 'hidden', 'text-overflow': 'ellipsis' };
					break;
			}
		},
		showDetail(key) {
			return this.listGridShowDetail.some(id => id == key) || this.listGridMode == 1;
		},
		markChange(key) {
			if (this.listGridShowDetail.some(id => id == key)) {
				return '&#9650';
			} else {
				return '&#9660';
			}
		},
		styleChange(key) {
			if (this.listGridMode == 1) { return {}; }

			if (this.listGridShowDetail.some(id => id == key)) {
				return { 'text-align': 'center' };
			} else {
				return { 'text-align': 'center', 'white-space': 'nowrap', overflow: 'hidden', 'text-overflow': 'ellipsis' };
			}
		},
		dataExpand(key) {
			if (this.listGridShowDetail.some(id => id == key)) {
				const index = this.listGridShowDetail.indexOf(key);
				this.listGridShowDetail.splice(index, 1);
			} else {
				this.listGridShowDetail.push(key);
			}
		},
	},
	watch: {
		isLoginFlag(newVal) {
			if (newVal === true) {
				this.fetchCustomizationData();
			}
		},
	},
	async mounted() {
		await this.getFirestoreData();
	}
};