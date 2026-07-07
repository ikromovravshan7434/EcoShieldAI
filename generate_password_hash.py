from getpass import getpass
from werkzeug.security import generate_password_hash

password = getpass("Yangi parol: ")
confirm = getpass("Parolni takrorlang: ")

if password != confirm:
    raise SystemExit("Parollar mos kelmadi.")

print("\nADMIN_PASSWORD_HASH uchun qiymat:\n")
print(generate_password_hash(password))
