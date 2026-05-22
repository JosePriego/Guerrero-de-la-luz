# Definimos los valores iniciales
vida_jugador = 50
vida_enemigo = 50

print("¡Un enemigo salvaje aparece!")

# Un bucle que se repite hasta que alguien muere
while vida_jugador > 0 and vida_enemigo > 0:
    accion = input("¿Atacar (a) o Curar (c)? ")
    
    if accion == "a":
        vida_enemigo = vida_enemigo - 10
        print("¡Atacaste! Vida del enemigo:", vida_enemigo)
    elif accion == "c":
        vida_jugador = vida_jugador + 10
        print("¡Te curaste! Tu vida:", vida_jugador)
    
    # Turno del enemigo (si sigue vivo)
    if vida_enemigo > 0:
        vida_jugador = vida_jugador - 5
        print("El enemigo te ataca. Tu vida:", vida_jugador)

if vida_jugador <= 0:
    print("Has sido derrotado...")
else:
    print("¡Has ganado el combate!")
