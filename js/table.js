class TablePaginate {
    constructor(url, table_id, paginate_id, search_id = null, extend_query = {}) {
        this.url = url
        this.table_id = table_id
        this.paginate_id = paginate_id
        this.search_id = search_id
        this.extend_query = extend_query
        
        this.search = null
    }

    deploy(var_name = "", page = 1, cols = []) {
        console.log(this.extend_query)
        if ($(`#${this.table_id} > tbody`).length == 0)
            return this.onError("Table ID is not found")

        this.cols = cols
        this.var_name = var_name
        this.tbody = $(`#${this.table_id} > tbody`)

        if ($("#" + this.search_id).length > 0) {
            $("#" + this.search_id).keyup(e => {
                if ($("#" + this.search_id).val().trim() != "")
                    this.search = $("#" + this.search_id).val()
                else
                    this.search = null
                
                this.load(1, 0, $("#" + this.search_id).val())
            })
        }

        if(Object.keys(this.extend_query).length == 0)
            this.load()
        else
            this.load(1, 0, null)
    }

    load(page = 1, start = 0, search = null) {
        this.page = page
        
        if (search) {
            page += "&search=" + search
        }
        
        for(let key in this.extend_query) {
            page += "&" + key + "=" + this.extend_query[key]
        }

        var parseResult = (result) => {
            if (result.data.docs.length == 0) {
                if (this.page > 1)
                    this.load(this.page - 1)
            }

            this.parseResult(result.data, start)
        }

        let onError = this.onError

        $.ajax({
            type: "GET",
            url: this.url + "?page=" + page,
            contentType: "application/json",
            dataType: "json",
            success: function (result) {
                this.ready = true
                parseResult(result)
            },
            error: function (error) {
                if (error.responseJSON)
                    onError(error.responseJSON.message)
                else
                    onError(error.statusText)
            }
        })
    }

    reload(page = 0) {
        if (page > 0)
            this.page = page

        this.load(this.page, this.start, this.search, this.extend_query)
    }

    parseResult(res, start) {
        this.start = start
        if (!"pagingCounter" in res)
            return this.onError("Cannot parse paginate data")

        /**
         * Table
         */

        var table_tmp = ``, table_index = 0 + (10 * (res.page - 1))

        this.thead = $(`#${this.table_id} > thead`)
        for (let i = 0; i < res.docs.length; i++) {
            var tr_temp = "<tr>"
            for (let j = 0; j <= this.thead.find("th").length; j++) {
                let cols = this.cols[j]

                if (cols) {
                    var value = null
                    if (cols.value) {
                        value = cols.value.match(/\{(.*?)\}/g)
                    }

                    var style = ` style="{STYLE_BODY}"`, have_style = false, style_list = []

                    if (cols.nowrap) {
                        have_style = true
                        style_list.push("white-space: nowrap")
                    }

                    style = style.replace("{STYLE_BODY}", style_list.join(";"))
                    style = (have_style) ? style : ""

                    if (value) {
                        if (value[0] == "{index}") {
                            tr_temp += `<td>${++table_index}</td>`
                            continue
                        }

                        let content = cols.value

                        for (let rg of value) {
                            rg = rg.replace(/\{|\}/g, "")

                            value = rg
                            let final_value = "res.docs[i]"

                            for (let obj of rg.split(".")) {
                                final_value += `["${obj}"]`
                            }

                            try {
                                eval("content = content.replace(`{${rg}}`, " + final_value + ")")
                            } catch {
                                if (cols.empty) {
                                    content = cols.empty
                                }
                            }


                        }

                        if (cols.decimal) {
                            content = cols.value.replace(`{${value}}`, res.docs[i][value].$numberDecimal)
                        }

                        if (cols.format) {
                            switch (cols.format) {
                                case "money":
                                    let money = new Intl.NumberFormat('vi-VN', {
                                        style: 'currency',
                                        currency: 'VND'
                                    })

                                    content = money.format(content)
                                    break
                                case "date":
                                    content = (new Date(content)).toLocaleString("vi-vn", { timeZone: "Asia/Ho_Chi_Minh" }).replace(/\,/, " ")
                                    break
                            }
                        }

                        if (cols.type) {
                            switch (cols.type) {
                                case "length":
                                    content = res.docs[i][value].length
                                    break
                            }
                        }

                        if (cols.if) {
                            if (content == cols.if.equals) {
                                content = cols.if.true
                            } else {
                                content = cols.if.false
                            }
                        }

                        let id = ""
                        if (cols.id) {
                            let _id = cols.id.match(/\{(.*?)\}/g)

                            if (_id) {
                                for (let $id of _id) {
                                    $id = $id.replace(/\{|\}/g, "")

                                    id = ` id="${cols.id.replace(`{${$id}}`, res.docs[i][$id])}"`
                                }
                            }
                        }

                        tr_temp += `<td${style}${id}>${content}</td>`
                    } else if (cols.value) {
                        tr_temp += `<td>${cols.value}</td>`
                    } else if (cols.call) {
                        let p_call = [], content
                        for (let param of cols.params) {
                            let $p = param.match(/\{(.*?)\}/g)
                            $p = $p[0].replace(/\{|\}/g, "")

                            p_call.push(`"${res.docs[i][$p]}"`)
                        }

                        eval(`content = cols.call(${p_call.join(",")})`)

                        let id = ""
                        if (cols.id) {
                            let _id = cols.id.match(/\{(.*?)\}/g)

                            if (_id) {
                                for (let $id of _id) {
                                    $id = $id.replace(/\{|\}/g, "")

                                    id = ` id="${cols.id.replace(`{${$id}}`, res.docs[i][$id])}"`
                                }
                            }
                        }
                        tr_temp += `<td${style}${id}>${content}</td>`
                    }
                }
            }
            tr_temp += "</tr>"

            table_tmp += tr_temp
        }
        
        if(table_tmp == "")
            table_tmp += `<tr>
                <td colspan="${this.cols.length}"><center>Chưa có dữ liệu nào được thêm</center></td>
            </tr>
        `

        this.tbody.html(table_tmp)

        /**
         * Paginate
         */
        let next = res.page + 1
        let prev = (res.page - 1 > 0) ? res.page - 1 : 1

        if ($(`#${this.paginate_id}`).length == 0)
            return this.onError("Paginate ID is not found")

        var temp = ``, i = start
        for (i; i <= (start + 5); i++) {
            let active = null

            if (i == 0)
                continue

            if (i > res.totalPages - 1)
                break

            if (i == res.page)
                active = " active"

            temp += `<li class="page-item${active}"><a style="cursor: pointer;" onclick="${this.var_name}.load(${i}, ${((start - 5) < 0) ? 0 : (i == start) ? start - 5 : start})" class="page-link">${i}</a></li>`
        }


        temp += `<li class="page-item${(i == res.page) ? " active" : ""}"><a style="cursor: pointer;" onclick="${this.var_name}.load(${i}, ${(res.totalPages == 5) ? 0 : i - 1})" class="page-link">${i}</a></li>`

        let next_section = start, prev_section = 0
        if ((i - 1) == res.page) {
            next_section = i - 1

            if (res.totalPages == 5)
                next_section = 0
        }

        prev_section = (prev % 5 == 0) ? start - 5 : start

        let paginate_template =
            `
            <li class="page-item${(!res.hasPrevPage) ? " disabled" : ""}"><a style="cursor: pointer;" onclick="${this.var_name}.load(1, 0)" class="page-link">First</a></li>

            <li class="page-item${(!res.hasPrevPage) ? " disabled" : ""}"><a style="cursor: pointer;" onclick="${this.var_name}.load(${prev}, ${prev_section})" class="page-link">Previous</a></li>
            {PAGINATE_BODY}
            <li class="page-item${(!res.hasNextPage) ? " disabled" : ""}"><a style="cursor: pointer;" onclick="${this.var_name}.load(${next}, ${next_section})" class="page-link">Next</a></li>

            <li class="page-item${(!res.hasNextPage) ? " disabled" : ""}"><a style="cursor: pointer;" onclick="${this.var_name}.load(${res.totalPages}, ${(res.totalPages - (res.totalPages % 5) - ((res.totalPages == 5) ? 5 : 0))})" class="page-link">Last</a></li>
        `

        this.paginate = $(`#${this.paginate_id}`)
        this.paginate.html(paginate_template.replace("{PAGINATE_BODY}", temp))

        this.onComplete()
    }

    onComplete = () => { }

    onError = (message) => { }
}