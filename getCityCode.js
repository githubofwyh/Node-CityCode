const http = require('http')
const cheerio = require('cheerio')
const path = require('path')
const fs = require('fs')

const url = 'http://www.weather.com.cn'

function download (url) {
  return new Promise((resolve, reject) => {
    http.get(url, function (res) {
      let data = "";
      res.on('data', function (chunk) {
        data += chunk;
      });
      res.on("end", function () {
        resolve(data);
      });
    }).on("error", function () {
      resolve(null);
    });
  })
}

const getProvinceHrefJson = url => download(url).then(data => {
  if (data) {
    const $ = cheerio.load(data)
    let provinceArr = []
    $('.lqcontentBoxH .lqcontentBoxheader ul li a').each((index, item) => {
      provinceArr.push({name: $(item).text(), href: $(item).attr("href")})
    })
    return provinceArr
  }
})

const getCityCodeJson = (url, proName) => download(url).then(data => {
  if (data) {
    const $ = cheerio.load(data)
    let pro = {
      name: proName,
      children: []
    }
    let tables = $($('.lqcontentBoxH .contentboxTab .hanml div:nth-child(1) .conMidtab3 table'))
    tables.each((i, table) => {
      let city = {
        name: '',
        children: []
      }
      let lines = $($(table).find('tr'))
      lines.each((i, item) => {
        let node = $($(item).find('td a')[0])
        let h = node.attr('href').replace('http://www.weather.com.cn/weather/', '').replace('.shtml', '')
        let name = node.text()
        city.children.push({
          name,
          code: h
        })
      })
      city.name = $(table).find('tbody tr:first-child td:first-child').text()
      pro.children.push(city)
    })
    return pro
  }
})

const saveJsontoFile = result => {
  const filesPath = path.resolve(__dirname, 'files')
  const writeJsonFile = r => () => {
    fs.writeFile(path.join(filesPath, 'cityCode.json'), r, err => {
      if (err) {
        return console.log(err);
      }
      console.log('文件创建成功，地址：' + path.join(filesPath, 'cityCode.json'));
    });
  }
  fs.readdir(filesPath, err => {
    if (err) {
      fs.mkdir(filesPath, writeJsonFile(result))
    } else {
      writeJsonFile(result)()
    }
  })
}

const init = async () => {
  let provinceHrefJson = await getProvinceHrefJson(url + '/textFC/hb.shtml')
  let result = {
    name: '中国',
    children: []
  }
  for (let {href, name} of provinceHrefJson) {
    console.log('开始爬取：', name)
    let pro = await getCityCodeJson(url + href, name)
    result.children.push(pro)
  }

  console.log('输出结果：', result)
  saveJsontoFile(JSON.stringify(result))
}

init()




