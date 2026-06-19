package main

import (
	"fmt"
	"github.com/gofiber/fiber/v3"
)

func main() {
	app := fiber.New()
	
	// Test route 1 with :name+
	app.Get("/test1/:name+/thumb", func(c fiber.Ctx) error {
		fmt.Printf("test1: name=%q name+=%q *=%q\n", c.Params("name"), c.Params("name+"), c.Params("*"))
		return c.SendString(fmt.Sprintf("test1: name=%s", c.Params("name")))
	})

	// Test route 2 with *name
	app.Get("/test2/*name/thumb", func(c fiber.Ctx) error {
		fmt.Printf("test2: name=%q *name=%q *=%q\n", c.Params("name"), c.Params("*name"), c.Params("*"))
		return c.SendString(fmt.Sprintf("test2: name=%s", c.Params("name")))
	})
	
	// Test route 3 with *
	app.Get("/test3/*/thumb", func(c fiber.Ctx) error {
		fmt.Printf("test3: *=%q\n", c.Params("*"))
		return c.SendString(fmt.Sprintf("test3: *=%s", c.Params("*")))
	})

	go func() {
		app.Listen(":9999")
	}()
	
	// Wait a bit and exit
	select {}
}
