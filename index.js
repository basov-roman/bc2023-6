const fs = require("fs");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const multer = require("multer");
const upload = multer();
const YAML = require("yaml");
const swaggerUi = require("swagger-ui-express");
const file = fs.readFileSync("./openapi.yaml", "utf8");
const swaggerDocument = YAML.parse(file);
const devicesFilePath = "devices.json";
const usersFilePath = "users.json";
const path = require("path");
const { checkIfIdExists, findObjectById } = require("./functions");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

    const fileName = `${file.fieldname}-${uniqueSuffix}${path.extname(
      file.originalname
    )}`;
    cb(null, fileName);
  },
});
const uploadWithStorage = multer({ storage });

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (!fs.existsSync(devicesFilePath)) {
  const initialData = [];
  fs.writeFileSync(devicesFilePath, JSON.stringify(initialData, null, 2));
}
if (!fs.existsSync(usersFilePath)) {
  const initialData = [];
  fs.writeFileSync(usersFilePath, JSON.stringify(initialData, null, 2));
}

app.get("/devices", (req, res) => {
  fs.readFile("devices.json", "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Помилка читання файлу JSON!" });
    }
    try {
      const jsonData = JSON.parse(data);
      res.header("Content-Type", "application/json");
      res.send(JSON.stringify(jsonData, null, 2));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Помилка розбору JSON даних!" });
    }
  });
});

app.post("/devices", upload.none(), (req, res) => {
  const formData = {
    id: req.body.id,
    device_Name: req.body.device_Name,
    description: req.body.description,
    serial_Number: req.body.serial_Number,
    manufacturer: req.body.manufacturer,
    used_By: "",
    picture: "",
  };

  if (
    !formData.device_Name ||
    !formData.description ||
    !formData.serial_Number ||
    !formData.manufacturer ||
    !formData.id
  ) {
    res
      .status(400)
      .send(
        "Поля 'id', 'device_Name', 'description', 'serial_Number', 'manufacturer' є обов'язковими для заповнення!"
      );
    return;
  }

  fs.readFile("devices.json", "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Помилка розбору JSON даних!");
    }

    let jsonData = [];

    try {
      jsonData = JSON.parse(data);
    } catch (error) {
      console.error(error);
      return res.status(500).send("Помилка парсингу JSON даних!");
    }

    if (checkIfIdExists(formData.id, jsonData)) {
      return res.status(400).send("Даний 'id' вже існує!");
    }

    jsonData.push(formData);

    fs.writeFile("devices.json", JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Помилка запису в JSON-файл!");
      }

      res.status(201).send("Новий девайс успішно зареєстровано!");
    });
  });
});

app.get("/devices/:device_Id", (req, res) => {
  const device_Id = req.params.device_Id;

  fs.readFile("devices.json", "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Помилка читання файлу JSON!" });
    }

    const jsonData = JSON.parse(data);

    device = findObjectById(device_Id, jsonData);

    if (device !== undefined) {
      res.json(device);
    } else {
      res.status(404).send("Девайс не знайдений!");
    }
  });
});

app.put("/devices/:device_Id", upload.none(), (req, res) => {
  const device_Id = req.params.device_Id;

  fs.readFile("devices.json", "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Помилка читання файлу JSON!");
    }

    let jsonData = JSON.parse(data);

    device = findObjectById(device_Id, jsonData);

    if (device !== undefined) {
      const updatedDevice = {
        id: device_Id,
        device_Name: req.body.device_Name,
        description: req.body.description,
        serial_Number: req.body.serial_Number,
        manufacturer: req.body.manufacturer,
        used_By: device.used_By,
        picture: device.picture,
      };

      jsonData = jsonData.filter((item) => item.id !== device_Id);

      device = updatedDevice;

      jsonData.push(device);

      fs.writeFile("devices.json", JSON.stringify(jsonData, null, 2), (err) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Помилка запису в JSON-файл!");
        }
        res.status(201).send("Дані про девайс успішно оновлено!");
      });
    } else {
      res.status(404).send("Девайс не знайдено!");
    }
  });
});

app.delete("/devices/:device_Id", (req, res) => {
  const device_Id = req.params.device_Id;

  fs.readFile("devices.json", "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Помилка читання файлу JSON!");
    }

    let jsonData = JSON.parse(data);

    device = findObjectById(device_Id, jsonData);

    if (device !== undefined) {
      if (device.picture !== "") {
        const picturePath = path.join("./uploads/", device.picture);
        fs.unlink(picturePath, (err) => {
          if (err) {
            console.error(err);
            const filePath = req.file.path;
            fs.unlink(filePath, (err) => {});
            console.log("Помилка видалення!");
          }
        });
      }

      jsonData = jsonData.filter((item) => item.id !== device_Id);
      fs.writeFile("devices.json", JSON.stringify(jsonData, null, 2), (err) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Помилка запису в JSON-файл!");
        }
        res.send("Дані про девайс успішно видалено!");
      });
    } else {
      res.status(404).send("Девайс не знайдено!");
    }
  });
});

app.get("/users", (req, res) => {
  fs.readFile("users.json", "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Помилка читання файлу JSON!" });
    }
    try {
      const jsonData = JSON.parse(data);
      res.header("Content-Type", "application/json");
      res.send(JSON.stringify(jsonData, null, 2));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Помилка розбору JSON даних!" });
    }
  });
});

app.post("/users", upload.none(), (req, res) => {
  const formData = {
    id: req.body.id,
    user_Name: req.body.user_Name,
    devices_In_Use: [],
  };

  if (!formData.id || !formData.user_Name) {
    res
      .status(400)
      .send("Поля 'id', 'user_Name' є обов'язковими для заповнення!");
    return;
  }

  fs.readFile("users.json", "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Помилка розбору JSON даних!");
    }

    let jsonData = [];

    try {
      jsonData = JSON.parse(data);
    } catch (error) {
      console.error(error);
      return res.status(500).send("Помилка парсингу JSON даних!");
    }

    if (checkIfIdExists(formData.id, jsonData)) {
      return res.status(400).send("Даний 'id' вже існує!");
    }

    jsonData.push(formData);

    fs.writeFile("users.json", JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Помилка запису в JSON-файл!");
      }

      res.status(201).send("Користувач успішно зареєстрований!");
    });
  });
});

app.get("/users/:user_Id", (req, res) => {
  const user_Id = req.params.user_Id;

  fs.readFile("users.json", "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Помилка читання файлу JSON!" });
    }

    const jsonData = JSON.parse(data);

    object = findObjectById(user_Id, jsonData);

    if (object !== undefined) {
      const jsonObject = {
        devices_In_Use: object.devices_In_Use,
      };
      res.json(jsonObject);
    } else {
      res.status(404).send("Користувача не знайдено!");
    }
  });
});

app.put("/users-devices/:user_Id", upload.none(), (req, res) => {
  const user_Id = req.params.user_Id;
  const device_Id = req.body.device_Id;

  fs.readFile("users.json", "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Помилка читання файлу JSON!");
    }

    let users_jsonData = JSON.parse(data);

    user = findObjectById(user_Id, users_jsonData);
    if (user == undefined)
      return res.status(404).send("Користувача не знайдено!");

    fs.readFile("devices.json", "utf8", (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Помилка читання файлу JSON!");
      }

      let devices_jsonData = JSON.parse(data);

      device = findObjectById(device_Id, devices_jsonData);
      if (device == undefined)
        return res.status(404).send("Девайс не знайдено!");

      if (device.used_By == "") {
        const deviceUpdate = {
          id: device.id,
          device_Name: device.device_Name,
          description: device.description,
          serial_Number: device.serial_Number,
          manufacturer: device.manufacturer,
          used_By: user.user_Name,
          picture: device.picture,
        };

        devices_jsonData = devices_jsonData.filter(
          (item) => item.id !== device_Id
        );
        devices_jsonData.push(deviceUpdate);

        fs.writeFile(
          "devices.json",
          JSON.stringify(devices_jsonData, null, 2),
          (err) => {
            if (err) {
              console.error(err);
            }
          }
        );

        user.devices_In_Use.push({
          device_Name: device.device_Name,
          serial_Number: device.serial_Number,
        });

        const userUpdate = {
          id: user.id,
          user_Name: user.user_Name,
          devices_In_Use: user.devices_In_Use,
        };

        users_jsonData = users_jsonData.filter((item) => item.id !== user_Id);
        users_jsonData.push(userUpdate);

        fs.writeFile(
          "users.json",
          JSON.stringify(users_jsonData, null, 2),
          (err) => {
            if (err) {
              console.error(err);
              return res.status(500).send("Помилка запису в JSON-файл!");
            }
            res
              .status(201)
              .send("Дані про користувача та девайс успішно оновлено!");
          }
        );
      } else {
        res.status(400).send("Девайс уже використовується іншим користувачем!");
      }
    });
  });
});

app.delete("/users-devices/:user_Id", upload.none(), (req, res) => {
  const user_Id = req.params.user_Id;
  const device_Id = req.body.device_Id;

  fs.readFile("users.json", "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Помилка читання файлу JSON!");
    }

    let users_jsonData = JSON.parse(data);

    user = findObjectById(user_Id, users_jsonData);
    if (user == undefined)
      return res.status(404).send("Користувача не знайдено!");

    fs.readFile("devices.json", "utf8", (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Помилка читання файлу JSON!");
      }

      let devices_jsonData = JSON.parse(data);

      device = findObjectById(device_Id, devices_jsonData);
      if (device == undefined)
        return res.status(404).send("Пристрій не знайдено!");

      const isDeviceInUseByUser = user.devices_In_Use.some((dev) => {
        return (
          dev.device_Name === device.device_Name &&
          dev.serial_Number === device.serial_Number
        );
      });

      if (isDeviceInUseByUser) {
        const deviceUpdate = {
          id: device.id,
          device_Name: device.device_Name,
          description: device.description,
          serial_Number: device.serial_Number,
          manufacturer: device.manufacturer,
          used_By: "",
          picture: device.picture,
        };

        devices_jsonData = devices_jsonData.filter(
          (item) => item.id !== device_Id
        );
        devices_jsonData.push(deviceUpdate);

        fs.writeFile(
          "devices.json",
          JSON.stringify(devices_jsonData, null, 2),
          (err) => {
            if (err) {
              console.error(err);
            }
          }
        );

        user.devices_In_Use = user.devices_In_Use.filter((DEV) => {
          return (
            DEV.device_Name !== device.device_Name &&
            DEV.serial_Number !== device.serial_Number
          );
        });

        const userUpdate = {
          id: user.id,
          user_Name: user.user_Name,
          devices_In_Use: user.devices_In_Use,
        };

        users_jsonData = users_jsonData.filter((item) => item.id !== user_Id);
        users_jsonData.push(userUpdate);

        fs.writeFile(
          "users.json",
          JSON.stringify(users_jsonData, null, 2),
          (err) => {
            if (err) {
              console.error(err);
              return res.status(500).send("Помилка запису в JSON-файл!");
            }
            res
              .status(201)
              .send("Дані про користувача та девайс успішно оновлено!");
          }
        );
      } else {
        res.status(400).send("Девайс не знайдено у вашому користуванні!");
      }
    });
  });
});

app.post("/pictures", (req, res, next) => {
  uploadWithStorage.single("device_Image")(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).send("Помилка завантаження файлу: " + err.message);
    } else if (err) {
      return res.status(500).send("Помилка сервера: " + err.message);
    }

    device_Id = req.body.device_Id;

    fs.readFile("devices.json", "utf8", (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Помилка читання файлу JSON!");
      }

      let devices_jsonData = JSON.parse(data);
      device = findObjectById(device_Id, devices_jsonData);

      if (device !== undefined) {
        if (device.picture !== "") {
          const picturePath = path.join("./uploads/", device.picture);
          fs.unlink(picturePath, (err) => {
            if (err) {
              console.error(err);
              const filePath = req.file.path;
              fs.unlink(filePath, (err) => {});
              console.log("Помилка видалення");
            }
          });
        }

        const deviceUpdate = {
          id: device.id,
          device_Name: device.device_Name,
          description: device.description,
          serial_Number: device.serial_Number,
          manufacturer: device.manufacturer,
          used_By: device.used_By,
          picture: req.file.filename,
        };

        devices_jsonData = devices_jsonData.filter(
          (item) => item.id !== device_Id
        );
        devices_jsonData.push(deviceUpdate);

        fs.writeFile(
          "devices.json",
          JSON.stringify(devices_jsonData, null, 2),
          (err) => {
            if (err) {
              console.error(err);
            }
          }
        );
      } else {
        const filePath = req.file.path;
        fs.unlink(filePath, (err) => {});
        return res.status(400).send("Девайс не знайдено!");
      }
      res.status(200).send("Файл успішно завантажено.");
    });
  });
});

app.get("/picture.html", (req, res) => {
  res.sendFile(__dirname + "/picture.html");
});

app.listen(8000, () => {
  console.log("Сервер працює на порту 8000!");
});
